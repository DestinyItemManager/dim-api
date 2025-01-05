import { captureMessage } from '@sentry/node';
import { chunk, groupBy, partition, sortBy } from 'es-toolkit';
import express from 'express';
import asyncHandler from 'express-async-handler';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import { DestinyVersion } from '../shapes/general.js';
import { ItemAnnotation, ItemHashTag } from '../shapes/item-annotations.js';
import { Loadout } from '../shapes/loadouts.js';
import {
  DeleteLoadoutUpdate,
  DeleteSearchUpdate,
  ItemHashTagUpdate,
  LoadoutUpdate,
  ProfileUpdate,
  ProfileUpdateRequest,
  ProfileUpdateResult,
  SavedSearchUpdate,
  SettingUpdate,
  TagCleanupUpdate,
  TagUpdate,
  TrackTriumphUpdate,
  UsedSearchUpdate,
} from '../shapes/profile.js';
import { SearchType } from '../shapes/search.js';
import { Settings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { client } from '../stately/client.js';
import {
  deleteItemAnnotation as deleteItemAnnotationListStately,
  updateItemAnnotation as updateItemAnnotationInStately,
} from '../stately/item-annotations-queries.js';
import { updateItemHashTag as updateItemHashTagInStately } from '../stately/item-hash-tags-queries.js';
import {
  deleteLoadout as deleteLoadoutInStately,
  updateLoadout as updateLoadoutInStately,
} from '../stately/loadouts-queries.js';
import {
  deleteSearch as deleteSearchInStately,
  UpdateSearch,
  updateSearches,
} from '../stately/searches-queries.js';
import { setSetting as setSettingInStately } from '../stately/settings-queries.js';
import { trackUntrackTriumphs } from '../stately/triumphs-queries.js';
import {
  badRequest,
  checkPlatformMembershipId,
  delay,
  isValidItemId,
  isValidPlatformMembershipId,
} from '../utils.js';

/**
 * Update profile information. This accepts a list of update operations and
 * will transactionally apply all of them.
 *
 * Note that you can't mix updates for multiple profiles - you'll have to make multiple requests.
 */
export const updateHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;
  const { id: appId } = req.dimApp as ApiApp;
  metrics.increment(`update.app.${appId}`, 1);
  const request = req.body as ProfileUpdateRequest;
  const { platformMembershipId, updates } = request;
  const destinyVersion = request.destinyVersion ?? 2;

  if (platformMembershipId && !isValidPlatformMembershipId(platformMembershipId)) {
    badRequest(res, `platformMembershipId ${platformMembershipId} is not in the right format`);
    return;
  }

  if (!checkPlatformMembershipId(platformMembershipId, profileIds)) {
    // This should force a re-auth
    res.status(401).send({
      error: 'UnknownProfileId',
      message: `platformMembershipId ${platformMembershipId} is not one of the profiles associated with your Bungie.net account. Try logging out and logging back in.`,
    });
    return;
  }

  if (destinyVersion !== 1 && destinyVersion !== 2) {
    badRequest(res, `destinyVersion ${destinyVersion as number} is not in the right format`);
    return;
  }

  if (!Array.isArray(updates)) {
    badRequest(res, `updates must be an array`);
    return;
  }

  const results: ProfileUpdateResult[] = validateUpdates(req, updates, platformMembershipId, appId);
  // Only attempt updates that pass validation
  const updatesToApply = updates.filter((_, index) => results[index].status === 'Success');

  await statelyUpdate(
    updatesToApply,
    bungieMembershipId,
    platformMembershipId ?? profileIds[0],
    destinyVersion,
  );

  res.send({
    results,
  });
});

// Statically validate the updates before we do any work in a database. This
// also builds the results list. If we throw an error from any of the actual
// database work, we fail the entire batch of updates together, so they can be
// retried.
function validateUpdates(
  req: express.Request,
  updates: ProfileUpdate[],
  platformMembershipId: string | undefined,
  appId: string,
): ProfileUpdateResult[] {
  const results: ProfileUpdateResult[] = [];

  for (const update of updates) {
    let result: ProfileUpdateResult = { status: 'Success' };

    metrics.increment(`update.action.${update.action}.count`);

    if (update.action !== 'setting' && !platformMembershipId) {
      metrics.increment('update.validation.platformMembershipIdMissing.count');
      result = {
        status: 'InvalidArgument',
        message: `${update.action} requires platform membership ID to be set`,
      };
    }

    switch (update.action) {
      case 'setting':
      case 'tag_cleanup':
      case 'delete_loadout':
      case 'track_triumph':
      case 'delete_search':
        // no special validation
        break;

      case 'loadout':
        result = validateUpdateLoadout(update.payload);
        break;

      case 'tag':
        result = validateUpdateItemAnnotation(update.payload);
        break;

      case 'item_hash_tag':
        result = validateUpdateItemHashTag(update.payload);
        break;

      case 'search':
      case 'save_search':
        result = validateSearch(update.payload);
        break;

      default:
        console.warn(
          `Unknown action type: ${(update as { action: string }).action} from ${appId}, ${req.header(
            'User-Agent',
          )}, ${req.header('Referer')}`,
        );
        result = {
          status: 'InvalidArgument',
          message: `Unknown action type: ${(update as { action: string }).action}`,
        };
    }
    if (result.status !== 'Success') {
      captureMessage(`update ${update.action} failed validation: ${result.message}`, {
        extra: {
          update,
          result,
          platformMembershipId,
          appId,
          dimVersion: req.headers['x-dim-version']?.[0],
        },
      });
      console.log('Stately failed update', update.action, result, appId);
    }
    results.push(result);
  }

  return results;
}

// TODO: For ease of porting, I made each update a separate transaction. But it
// would be more efficient to batch them all into one transaction. That said,
// aside from bulk-tagging, it's most likely that only one update will be sent
// at a time.
async function statelyUpdate(
  updates: ProfileUpdate[],
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
) {
  // We want to group save/delete search and search updates together
  const actionKey = (u: ProfileUpdate) =>
    u.action === 'save_search' || u.action === 'delete_search' ? 'search' : u.action;

  const sortedUpdates = sortBy(updates, [actionKey]).flatMap((u): ProfileUpdate[] => {
    // Separate out tag_cleanup updates into individual updates
    if (u.action === 'tag_cleanup') {
      return u.payload.map((p) => ({ action: 'tag_cleanup', payload: [p] }));
    }
    return [u];
  });

  const tagIds = new Set<string>();
  for (const update of sortedUpdates) {
    if (update.action === 'tag') {
      tagIds.add(update.payload.id);
    }
  }

  for (const updateChunk of chunk(sortedUpdates, 25)) {
    await client.transaction(async (txn) => {
      for (const [action, group] of Object.entries(groupBy(updateChunk, actionKey))) {
        switch (action) {
          case 'setting': {
            // The DIM reducer already combines settings updates, but just in case...
            let mergedSettings: Partial<Settings> = (group as SettingUpdate[]).shift()!.payload;
            for (const update of group as SettingUpdate[]) {
              mergedSettings = { ...mergedSettings, ...update.payload };
            }
            await setSettingInStately(txn, bungieMembershipId, mergedSettings);
            break;
          }

          case 'loadout':
            await updateLoadoutInStately(
              txn,
              platformMembershipId!,
              destinyVersion,
              (group as LoadoutUpdate[]).map((u) => u.payload),
            );
            break;

          case 'delete_loadout':
            await deleteLoadoutInStately(
              txn,
              platformMembershipId!,
              destinyVersion,
              (group as DeleteLoadoutUpdate[]).map((u) => u.payload),
            );
            break;

          case 'tag':
            await updateItemAnnotationInStately(
              txn,
              platformMembershipId!,
              destinyVersion,
              (group as TagUpdate[]).map((u) => u.payload),
            );
            break;

          case 'tag_cleanup': {
            const instanceIds = (group as TagCleanupUpdate[])
              .flatMap((u) => u.payload)
              .filter(
                (id) =>
                  // We've seen a problem where DIM sends a tag_cleanup and a tag for the same item in the same update
                  !tagIds.has(id) && isValidItemId(id),
              );
            if (instanceIds.length) {
              await deleteItemAnnotationListStately(
                txn,
                platformMembershipId!,
                destinyVersion,
                instanceIds,
              );
            }
            break;
          }

          case 'item_hash_tag':
            for (const update of group as ItemHashTagUpdate[]) {
              // TODO: Batch this one too
              await updateItemHashTagInStately(txn, platformMembershipId!, update.payload);
            }
            break;

          case 'track_triumph':
            await trackUntrackTriumphs(
              txn,
              platformMembershipId!,
              (group as TrackTriumphUpdate[]).map((u) => u.payload),
            );
            break;

          // saved searches and used searches are collectively "searches"
          case 'search': {
            const searchUpdates = consolidateSearchUpdates(
              group as (UsedSearchUpdate | SavedSearchUpdate | DeleteSearchUpdate)[],
            );
            const [deletes, updates] = partition(searchUpdates, (u) => u.deleted);
            if (deletes.length) {
              await deleteSearchInStately(
                txn,
                platformMembershipId!,
                destinyVersion,
                deletes.map((u) => u.query),
              );
            }
            if (updates.length) {
              await updateSearches(txn, platformMembershipId!, destinyVersion, updates);
            }
            break;
          }
        }
      }
    });
    await delay(100); // sleep to let transaction flush
  }
}

function validateUpdateLoadout(loadout: Loadout): ProfileUpdateResult {
  return validateLoadout('update', loadout) ?? { status: 'Success' };
}

export function validateLoadout(metricPrefix: string, loadout: Loadout) {
  if (!loadout.name) {
    metrics.increment(`${metricPrefix}.validation.loadoutNameMissing.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout name missing',
    };
  }
  if (loadout.name.length > 120) {
    metrics.increment(`${metricPrefix}.validation.loadoutNameTooLong.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout names must be under 120 characters',
    };
  }

  if (loadout.notes && loadout.notes.length > 2048) {
    metrics.increment(`${metricPrefix}.validation.loadoutNotesTooLong.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout notes must be under 2048 characters',
    };
  }

  if (!loadout.id) {
    metrics.increment(`${metricPrefix}.loadoutIdMissing.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout id missing',
    };
  }
  if (loadout.id && loadout.id.length > 120) {
    metrics.increment(`${metricPrefix}.validation.loadoutIdTooLong.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout ids must be under 120 characters',
    };
  }

  if (!Number.isFinite(loadout.classType)) {
    metrics.increment(`${metricPrefix}.validation.classTypeMissing.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type missing or malformed',
    };
  }
  if (loadout.classType < 0 || loadout.classType > 3) {
    metrics.increment(`${metricPrefix}.validation.classTypeOutOfRange.count`);
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type out of range',
    };
  }
  if ([...loadout.equipped, ...loadout.unequipped].some((i) => i.id && !isValidItemId(i.id))) {
    metrics.increment(`${metricPrefix}.validation.itemIdFormat.count`);
    return {
      status: 'InvalidArgument',
      message: 'Item ID is invalid',
    };
  }
  for (const constraint of loadout.parameters?.statConstraints ?? []) {
    for (const tier of [constraint.minTier, constraint.maxTier]) {
      if (tier === undefined) {
        continue;
      }
      if (!Number.isInteger(tier)) {
        metrics.increment(`${metricPrefix}.validation.tierValueNotInteger.count`);
        return {
          status: 'InvalidArgument',
          message: `Loadout Optimizer stat tiers must be integers, not ${tier}`,
        };
      }
      if (tier < 0 || tier > 10) {
        metrics.increment(`${metricPrefix}.validation.tierValueOutOfRange.count`);
        return {
          status: 'InvalidArgument',
          message: 'Loadout Optimizer stat tiers must be between 0 and 10',
        };
      }
    }
  }

  return undefined;
}

function validateUpdateItemAnnotation(itemAnnotation: ItemAnnotation): ProfileUpdateResult {
  if (!isValidItemId(itemAnnotation.id)) {
    metrics.increment('update.validation.badItemId.count');
    return {
      status: 'InvalidArgument',
      message: 'item ID is not in the right format',
    };
  }

  if (
    itemAnnotation.tag &&
    !['favorite', 'keep', 'infuse', 'junk', 'archive'].includes(itemAnnotation.tag)
  ) {
    metrics.increment('update.validation.tagNotRecognized.count');
    return {
      status: 'InvalidArgument',
      message: `Tag value ${itemAnnotation.tag} is not recognized`,
    };
  }
  if (itemAnnotation.notes && itemAnnotation.notes.length > 1024) {
    metrics.increment('update.validation.notesTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Notes must be under 1024 characters',
    };
  }

  return { status: 'Success' };
}

function validateUpdateItemHashTag(itemAnnotation: ItemHashTag): ProfileUpdateResult {
  if (!Number.isInteger(itemAnnotation.hash)) {
    metrics.increment('update.validation.badItemHash.count');
    return {
      status: 'InvalidArgument',
      message: 'item hash is not in the right format',
    };
  }

  if (
    itemAnnotation.tag &&
    !['favorite', 'keep', 'infuse', 'junk', 'archive'].includes(itemAnnotation.tag)
  ) {
    metrics.increment('update.validation.tagNotRecognized.count');
    return {
      status: 'InvalidArgument',
      message: `Tag value ${itemAnnotation.tag} is not recognized`,
    };
  }
  if (itemAnnotation.notes && itemAnnotation.notes.length > 1024) {
    metrics.increment('update.validation.notesTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Notes must be under 1024 characters',
    };
  }

  return { status: 'Success' };
}

function validateSearch(payload: UsedSearchUpdate['payload']): ProfileUpdateResult {
  if (payload.query.length > 2048) {
    metrics.increment('update.validation.searchTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Search query must be under 2048 characters',
    };
  } else if (payload.query.length === 0) {
    metrics.increment('update.validation.searchEmpty.count');
    return {
      status: 'InvalidArgument',
      message: 'Search query must not be empty',
    };
  }
  return { status: 'Success' };
}

function consolidateSearchUpdates(
  updates: (UsedSearchUpdate | SavedSearchUpdate | DeleteSearchUpdate)[],
) {
  const updatesByQuery = groupBy(updates, (u) => u.payload.query);
  return Object.values(updatesByQuery).map((group) => {
    const u: UpdateSearch = {
      query: group[0].payload.query,
      type: group[0].payload.type ?? SearchType.Item,
      incrementUsed: 0,
      deleted: false,
    };
    for (const update of group) {
      if (update.action === 'save_search') {
        u.deleted = false;
        u.saved = update.payload.saved;
      } else if (update.action === 'delete_search') {
        u.deleted = true;
        u.incrementUsed = 0;
      } else {
        u.deleted = false;
        u.incrementUsed++;
      }
    }
    return u;
  });
}

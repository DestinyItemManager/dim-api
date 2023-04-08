import asyncHandler from 'express-async-handler';
import { ClientBase } from 'pg';
import { transaction } from '../db';
import {
  deleteItemAnnotationList,
  updateItemAnnotation as updateItemAnnotationInDb,
} from '../db/item-annotations-queries';
import { updateItemHashTag as updateItemHashTagInDb } from '../db/item-hash-tags-queries';
import {
  deleteLoadout as deleteLoadoutInDb,
  updateLoadout as updateLoadoutInDb,
} from '../db/loadouts-queries';
import {
  deleteSearch as deleteSearchInDb,
  saveSearch as saveSearchInDb,
  updateUsedSearch,
} from '../db/searches-queries';
import { setSetting as setSettingInDb } from '../db/settings-queries';
import { trackTriumph as trackTriumphInDb, unTrackTriumph } from '../db/triumphs-queries';
import { metrics } from '../metrics';
import { DestinyVersion } from '../shapes/general';
import { ItemAnnotation } from '../shapes/item-annotations';
import { Loadout } from '../shapes/loadouts';
import {
  ItemHashTagUpdate,
  ProfileUpdateRequest,
  ProfileUpdateResult,
  SavedSearchUpdate,
  TrackTriumphUpdate,
  UsedSearchUpdate,
} from '../shapes/profile';
import { Settings } from '../shapes/settings';
import {
  badRequest,
  checkPlatformMembershipId,
  isValidItemId,
  isValidPlatformMembershipId,
} from '../utils';

/**
 * Update profile information. This accepts a list of update operations and
 * will transactionally apply all of them.
 *
 * Note that you can't mix updates for multiple profiles - you'll have to make multiple requests.
 */
export const updateHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user!;
  const { id: appId } = req.dimApp!;
  metrics.increment('update.app.' + appId, 1);
  const request = req.body as ProfileUpdateRequest;
  const { platformMembershipId, updates } = request;
  const destinyVersion = request.destinyVersion ?? 2;

  if (platformMembershipId && !isValidPlatformMembershipId(platformMembershipId)) {
    badRequest(res, `platformMembershipId ${platformMembershipId} is not in the right format`);
    return;
  }

  checkPlatformMembershipId(platformMembershipId, profileIds, 'update');

  if (destinyVersion !== 1 && destinyVersion !== 2) {
    badRequest(res, `destinyVersion ${destinyVersion} is not in the right format`);
    return;
  }

  if (!Array.isArray(updates)) {
    badRequest(res, `updates must be an array`);
    return;
  }

  const results = await transaction(async (client) => {
    const results: ProfileUpdateResult[] = [];

    for (const update of updates) {
      let result: ProfileUpdateResult;

      metrics.increment('update.action.' + update.action + '.count');

      switch (update.action) {
        case 'setting':
          result = await updateSetting(client, appId, bungieMembershipId, update.payload);
          break;

        case 'loadout':
          result = await updateLoadout(
            client,
            appId,
            bungieMembershipId,
            platformMembershipId,
            destinyVersion,
            update.payload
          );
          break;

        case 'delete_loadout':
          result = await deleteLoadout(client, bungieMembershipId, update.payload);
          break;

        case 'tag':
          result = await updateItemAnnotation(
            client,
            appId,
            bungieMembershipId,
            platformMembershipId,
            destinyVersion,
            update.payload
          );
          break;

        case 'tag_cleanup':
          result = await tagCleanup(client, bungieMembershipId, update.payload);
          break;

        case 'item_hash_tag':
          result = await updateItemHashTag(client, appId, bungieMembershipId, update.payload);
          break;

        case 'track_triumph':
          result = await trackTriumph(
            client,
            appId,
            bungieMembershipId,
            platformMembershipId,
            update.payload
          );
          break;

        case 'search':
          result = await recordSearch(
            client,
            appId,
            bungieMembershipId,
            destinyVersion,
            update.payload
          );
          break;

        case 'save_search':
          result = await saveSearch(
            client,
            appId,
            bungieMembershipId,
            destinyVersion,
            update.payload
          );
          break;

        case 'delete_search':
          result = await deleteSearch(
            client,
            bungieMembershipId,
            destinyVersion,
            update.payload.query
          );
          break;

        default:
          console.warn(
            `Unknown action type: ${(update as any).action} from ${appId}, ${req.header(
              'User-Agent'
            )}, ${req.header('Referer')}`
          );
          result = {
            status: 'InvalidArgument',
            message: `Unknown action type: ${(update as any).action}`,
          };
      }
      results.push(result);
    }

    return results;
  });

  res.send({
    results,
  });
});

async function updateSetting(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  settings: Partial<Settings>
): Promise<ProfileUpdateResult> {
  // TODO: how do we set settings back to the default? Maybe just load and replace the whole settings object.

  const start = new Date();
  await setSettingInDb(client, appId, bungieMembershipId, settings);
  metrics.timing('update.setting', start);

  return { status: 'Success' };
}

async function updateLoadout(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  loadout: Loadout
): Promise<ProfileUpdateResult> {
  if (!platformMembershipId) {
    metrics.increment('update.validation.platformMembershipIdMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadouts require platform membership ID to be set',
    };
  }

  const validationResult = validateLoadout('update', loadout);
  if (validationResult) {
    return validationResult;
  }

  const start = new Date();
  await updateLoadoutInDb(
    client,
    appId,
    bungieMembershipId,
    platformMembershipId,
    destinyVersion,
    loadout
  );
  metrics.timing('update.loadout', start);

  return { status: 'Success' };
}

export function validateLoadout(metricPrefix: string, loadout: Loadout) {
  if (!loadout.name) {
    metrics.increment(metricPrefix + '.validation.loadoutNameMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout name missing',
    };
  }
  if (loadout.name.length > 120) {
    metrics.increment(metricPrefix + '.validation.loadoutNameTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout names must be under 120 characters',
    };
  }

  if (loadout.notes && loadout.notes.length > 2048) {
    metrics.increment(metricPrefix + '.validation.loadoutNotesTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout notes must be under 2048 characters',
    };
  }

  if (!loadout.id) {
    metrics.increment(metricPrefix + '.loadoutIdMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout id missing',
    };
  }
  if (loadout.id && loadout.id.length > 120) {
    metrics.increment(metricPrefix + '.validation.loadoutIdTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout ids must be under 120 characters',
    };
  }

  if (!Number.isFinite(loadout.classType)) {
    metrics.increment(metricPrefix + '.validation.classTypeMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type missing or malformed',
    };
  }
  if (loadout.classType < 0 || loadout.classType > 3) {
    metrics.increment(metricPrefix + '.validation.classTypeOutOfRange.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type out of range',
    };
  }
  if ([...loadout.equipped, ...loadout.unequipped].some((i) => i.id && !isValidItemId(i.id))) {
    metrics.increment(metricPrefix + '.validation.itemIdFormat.count');
    return {
      status: 'InvalidArgument',
      message: 'Item ID is invalid',
    };
  }

  return undefined;
}

async function deleteLoadout(
  client: ClientBase,
  bungieMembershipId: number,
  loadoutId: string
): Promise<ProfileUpdateResult> {
  const start = new Date();
  const loadout = await deleteLoadoutInDb(client, bungieMembershipId, loadoutId);
  metrics.timing('update.deleteLoadout', start);
  if (loadout == null) {
    return { status: 'NotFound', message: 'No loadout found with that ID' };
  }

  return { status: 'Success' };
}

async function updateItemAnnotation(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  itemAnnotation: ItemAnnotation
): Promise<ProfileUpdateResult> {
  if (!platformMembershipId) {
    metrics.increment('update.validation.platformMembershipIdMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Tags require platform membership ID to be set',
    };
  }

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

  const start = new Date();
  await updateItemAnnotationInDb(
    client,
    appId,
    bungieMembershipId,
    platformMembershipId,
    destinyVersion,
    itemAnnotation
  );
  metrics.timing('update.tag', start);

  return { status: 'Success' };
}

async function tagCleanup(
  client: ClientBase,
  bungieMembershipId: number,
  inventoryItemIds: string[]
): Promise<ProfileUpdateResult> {
  const start = new Date();
  await deleteItemAnnotationList(
    client,
    bungieMembershipId,
    inventoryItemIds.filter(isValidItemId)
  );
  metrics.timing('update.tagCleanup', start);

  return { status: 'Success' };
}

async function trackTriumph(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  payload: TrackTriumphUpdate['payload']
): Promise<ProfileUpdateResult> {
  if (!platformMembershipId) {
    metrics.increment('update.validation.platformMembershipIdMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Tracked triumphs require platform membership ID to be set',
    };
  }

  const start = new Date();
  payload.tracked
    ? await trackTriumphInDb(
        client,
        appId,
        bungieMembershipId,
        platformMembershipId,
        payload.recordHash
      )
    : await unTrackTriumph(client, bungieMembershipId, platformMembershipId, payload.recordHash);
  metrics.timing('update.trackTriumph', start);

  return { status: 'Success' };
}

async function recordSearch(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  payload: UsedSearchUpdate['payload']
): Promise<ProfileUpdateResult> {
  // TODO: I did a silly thing and made the query part of the search table's
  // primary key, instead of using a fixed-size hash of the query. This limits
  // how big a query we can store (and bloats the index). I'll need to do some
  // surgery to fix that, but we should probably just generally refuse to save
  // long queries.
  if (payload.query.length > 2048) {
    metrics.increment('update.validation.searchTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Search query must be under 2048 characters',
    };
  }

  const start = new Date();
  await updateUsedSearch(client, appId, bungieMembershipId, destinyVersion, payload.query);
  metrics.timing('update.recordSearch', start);

  return { status: 'Success' };
}

async function saveSearch(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  payload: SavedSearchUpdate['payload']
): Promise<ProfileUpdateResult> {
  // TODO: I did a silly thing and made the query part of the search table's
  // primary key, instead of using a fixed-size hash of the query. This limits
  // how big a query we can store (and bloats the index). I'll need to do some
  // surgery to fix that, but we should probably just generally refuse to save
  // long queries.
  if (payload.query.length > 2048) {
    metrics.increment('update.validation.searchTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Search query must be under 2048 characters',
    };
  }

  const start = new Date();
  await saveSearchInDb(
    client,
    appId,
    bungieMembershipId,
    destinyVersion,
    payload.query,
    payload.saved
  );
  metrics.timing('update.saveSearch', start);

  return { status: 'Success' };
}

async function deleteSearch(
  client: ClientBase,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  query: string
): Promise<ProfileUpdateResult> {
  const start = new Date();
  await deleteSearchInDb(client, bungieMembershipId, destinyVersion, query);
  metrics.timing('update.deleteSearch', start);

  return { status: 'Success' };
}

async function updateItemHashTag(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  payload: ItemHashTagUpdate['payload']
): Promise<ProfileUpdateResult> {
  const start = new Date();
  await updateItemHashTagInDb(client, appId, bungieMembershipId, payload);
  metrics.timing('update.updateItemHashTag', start);

  return { status: 'Success' };
}

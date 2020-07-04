import asyncHandler from 'express-async-handler';
import { transaction } from '../db';
import {
  ProfileUpdateRequest,
  ProfileUpdateResult,
  TrackTriumphUpdate,
  UsedSearchUpdate,
  SavedSearchUpdate,
} from '../shapes/profile';
import { badRequest } from '../utils';
import { ClientBase } from 'pg';
import { Settings } from '../shapes/settings';
import { DestinyVersion } from '../shapes/general';
import { Loadout } from '../shapes/loadouts';
import { setSetting as setSettingInDb } from '../db/settings-queries';
import {
  updateLoadout as updateLoadoutInDb,
  deleteLoadout as deleteLoadoutInDb,
} from '../db/loadouts-queries';
import {
  updateItemAnnotation as updateItemAnnotationInDb,
  deleteItemAnnotationList,
} from '../db/item-annotations-queries';
import { ItemAnnotation } from '../shapes/item-annotations';
import { metrics } from '../metrics';
import { recordAuditLog } from '../db/audit-log-queries';
import {
  trackTriumph as trackTriumphInDb,
  unTrackTriumph,
} from '../db/triumphs-queries';
import {
  updateUsedSearch,
  saveSearch as saveSearchInDb,
} from '../db/searches-queries';

/**
 * Update profile information. This accepts a list of update operations and
 * will transactionally apply all of them.
 *
 * Note that you can't mix updates for multiple profiles - you'll have to make multiple requests.
 */
export const updateHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;
  const { id: appId } = req.dimApp!;
  const request = req.body as ProfileUpdateRequest;
  const { platformMembershipId, updates } = request;
  const destinyVersion = request.destinyVersion ?? 2;

  const results: ProfileUpdateResult[] = [];

  await transaction(async (client) => {
    for (const update of updates) {
      let result: ProfileUpdateResult;

      metrics.increment('update.action.' + update.action + '.count');

      switch (update.action) {
        case 'setting':
          result = await updateSetting(
            client,
            appId,
            bungieMembershipId,
            update.payload
          );
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
          result = await deleteLoadout(
            client,
            appId,
            bungieMembershipId,
            platformMembershipId,
            destinyVersion,
            update.payload
          );
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
          result = await tagCleanup(
            client,
            appId,
            bungieMembershipId,
            platformMembershipId,
            destinyVersion,
            update.payload
          );
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

        default:
          badRequest(res, `Unknown action type ${(update as any).action}`);
          return;
      }
      results.push(result);
    }
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

  await setSettingInDb(client, appId, bungieMembershipId, settings);

  await recordAuditLog(client, bungieMembershipId, {
    type: 'settings',
    payload: settings,
    createdBy: appId,
  });

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

  if (!loadout.name) {
    metrics.increment('update.validation.loadoutNameMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout name missing',
    };
  }
  if (loadout.name && loadout.name.length > 120) {
    metrics.increment('update.validation.loadoutNameTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout names must be under 120 characters',
    };
  }

  if (!loadout.id) {
    metrics.increment('update.loadoutIdMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout id missing',
    };
  }
  if (loadout.id && loadout.id.length > 120) {
    metrics.increment('update.validation.loadoutIdTooLong.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout ids must be under 120 characters',
    };
  }

  if (!Number.isFinite(loadout.classType)) {
    metrics.increment('update.validation.classTypeMissing.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type missing or malformed',
    };
  }
  if (loadout.classType < 0 || loadout.classType > 3) {
    metrics.increment('update.validation.classTypeOutOfRange.count');
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type out of range',
    };
  }

  await updateLoadoutInDb(
    client,
    appId,
    bungieMembershipId,
    platformMembershipId,
    destinyVersion,
    loadout
  );

  await recordAuditLog(client, bungieMembershipId, {
    type: 'loadout',
    platformMembershipId,
    destinyVersion,
    payload: {
      name: loadout.name,
    },
    createdBy: appId,
  });

  return { status: 'Success' };
}

async function deleteLoadout(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  loadoutId: string
): Promise<ProfileUpdateResult> {
  const loadout = await deleteLoadoutInDb(
    client,
    bungieMembershipId,
    loadoutId
  );
  if (loadout == null) {
    return { status: 'NotFound', message: 'No loadout found with that ID' };
  }

  await recordAuditLog(client, bungieMembershipId, {
    type: 'delete_loadout',
    platformMembershipId,
    destinyVersion,
    payload: {
      name: loadout.name,
    },
    createdBy: appId,
  });

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

  if (
    itemAnnotation.tag &&
    !['favorite', 'keep', 'infuse', 'junk', 'archive'].includes(
      itemAnnotation.tag
    )
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

  await updateItemAnnotationInDb(
    client,
    appId,
    bungieMembershipId,
    platformMembershipId,
    destinyVersion,
    itemAnnotation
  );

  await recordAuditLog(client, bungieMembershipId, {
    type: 'tag',
    platformMembershipId,
    destinyVersion,
    payload: itemAnnotation,
    createdBy: appId,
  });

  return { status: 'Success' };
}

async function tagCleanup(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string | undefined,
  destinyVersion: DestinyVersion,
  inventoryItemIds: string[]
): Promise<ProfileUpdateResult> {
  const result = await deleteItemAnnotationList(
    client,
    bungieMembershipId,
    inventoryItemIds
  );

  await recordAuditLog(client, bungieMembershipId, {
    type: 'tag_cleanup',
    platformMembershipId,
    destinyVersion,
    payload: {
      deleted: result.rowCount,
    },
    createdBy: appId,
  });

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

  payload.tracked
    ? await trackTriumphInDb(
        client,
        appId,
        bungieMembershipId,
        platformMembershipId,
        payload.recordHash
      )
    : await unTrackTriumph(
        client,
        bungieMembershipId,
        platformMembershipId,
        payload.recordHash
      );

  await recordAuditLog(client, bungieMembershipId, {
    type: 'track_triumph',
    platformMembershipId,
    destinyVersion: 2,
    payload,
    createdBy: appId,
  });

  return { status: 'Success' };
}

async function recordSearch(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  payload: UsedSearchUpdate['payload']
): Promise<ProfileUpdateResult> {
  await updateUsedSearch(
    client,
    appId,
    bungieMembershipId,
    destinyVersion,
    payload.query
  );

  await recordAuditLog(client, bungieMembershipId, {
    type: 'search',
    destinyVersion,
    payload,
    createdBy: appId,
  });

  return { status: 'Success' };
}

async function saveSearch(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  destinyVersion: DestinyVersion,
  payload: SavedSearchUpdate['payload']
): Promise<ProfileUpdateResult> {
  await saveSearchInDb(
    client,
    appId,
    bungieMembershipId,
    destinyVersion,
    payload.query,
    payload.saved
  );

  await recordAuditLog(client, bungieMembershipId, {
    type: 'save_search',
    destinyVersion,
    payload,
    createdBy: appId,
  });

  return { status: 'Success' };
}

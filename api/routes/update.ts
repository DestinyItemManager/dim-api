import asyncHandler from 'express-async-handler';
import { transaction } from '../db';
import { ProfileUpdateRequest, ProfileUpdateResult } from '../shapes/profile';
import { badRequest } from '../utils';
import { ClientBase } from 'pg';
import { Settings } from '../shapes/settings';
import { DestinyVersion } from '../shapes/general';
import { Loadout } from '../shapes/loadouts';
import { setSetting as setSettingInDb } from '../db/settings-queries';
import { updateLoadout as updateLoadoutInDb } from '../db/loadouts-queries';
import { updateItemAnnotation as updateItemAnnotationInDb } from '../db/item-annotations-queries';
import { ItemAnnotation } from '../shapes/item-annotations';
import { metrics } from '../metrics';

/**
 * Update profile information. This accepts a list of update operations and
 * will transactionally apply all of them.
 *
 * Note that you can't mix updates for multiple profiles - you'll have to make multiple requests.
 */
export const updateHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;
  const { id: appId } = req.dimApp!;
  const {
    platformMembershipId,
    destinyVersion,
    updates
  } = req.body as ProfileUpdateRequest;

  const results: ProfileUpdateResult[] = [];

  await transaction(async (client) => {
    for (const update of updates) {
      let result: ProfileUpdateResult;
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
        default:
          badRequest(res, `Unknown action type ${(update as any).action}`);
          return;
      }
      results.push(result);
    }
  });

  res.send({
    results
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
  return { status: 'Success' };
}

async function updateLoadout(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  loadout: Loadout
): Promise<ProfileUpdateResult> {
  if (!loadout.name) {
    metrics.increment('update.validation.loadoutNameMissing');
    return {
      status: 'InvalidArgument',
      message: 'Loadout name missing'
    };
  }
  if (loadout.name && loadout.name.length > 120) {
    metrics.increment('update.validation.loadoutNameTooLong');
    return {
      status: 'InvalidArgument',
      message: 'Loadout names must be under 120 characters'
    };
  }

  if (!loadout.id) {
    metrics.increment('update.loadoutIdMissing');
    return {
      status: 'InvalidArgument',
      message: 'Loadout id missing'
    };
  }
  if (loadout.id && loadout.id.length > 120) {
    metrics.increment('update.validation.loadoutIdTooLong');
    return {
      status: 'InvalidArgument',
      message: 'Loadout ids must be under 120 characters'
    };
  }

  if (!Number.isFinite(loadout.classType)) {
    metrics.increment('update.validation.classTypeMissing');
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type missing or malformed'
    };
  }
  if (loadout.classType < 0 || loadout.classType > 3) {
    metrics.increment('update.validation.classTypeOutOfRange');
    return {
      status: 'InvalidArgument',
      message: 'Loadout class type out of range'
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
  return { status: 'Success' };
}

async function updateItemAnnotation(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  destinyVersion: DestinyVersion,
  itemAnnotation: ItemAnnotation
): Promise<ProfileUpdateResult> {
  if (
    itemAnnotation.tag &&
    !['favorite', 'keep', 'infuse', 'junk', 'archive'].includes(
      itemAnnotation.tag
    )
  ) {
    metrics.increment('update.validation.tagNotRecognized');
    return {
      status: 'InvalidArgument',
      message: `Tag value ${itemAnnotation.tag} is not recognized`
    };
  }
  if (itemAnnotation.notes && itemAnnotation.notes.length > 1024) {
    metrics.increment('update.validation.notesTooLong');
    return {
      status: 'InvalidArgument',
      message: 'Notes must be under 1024 characters'
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
  return { status: 'Success' };
}

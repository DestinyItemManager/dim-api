import { isEmpty } from 'es-toolkit/compat';
import asyncHandler from 'express-async-handler';
import { transaction } from '../db/index.js';
import {
  softDeleteAllItemAnnotations,
  updateItemAnnotation,
} from '../db/item-annotations-queries.js';
import { softDeleteAllItemHashTags, updateItemHashTag } from '../db/item-hash-tags-queries.js';
import { softDeleteAllLoadouts, updateLoadout } from '../db/loadouts-queries.js';
import { doMigration, getMigrationState, MigrationState } from '../db/migration-state-queries.js';
import { importSearch, softDeleteAllSearches } from '../db/searches-queries.js';
import { replaceSettings } from '../db/settings-queries.js';
import { softDeleteAllTrackedTriumphs, trackTriumph } from '../db/triumphs-queries.js';
import { ExportResponse } from '../shapes/export.js';
import { DestinyVersion } from '../shapes/general.js';
import { ImportResponse } from '../shapes/import.js';
import { ItemAnnotation, ItemHashTag } from '../shapes/item-annotations.js';
import { Loadout } from '../shapes/loadouts.js';
import { defaultSettings, Settings } from '../shapes/settings.js';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';
import { badRequest, subtractObject } from '../utils.js';

export const importHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  const importData = req.body as ExportResponse;

  const { settings, loadouts, itemAnnotations, triumphs, searches, itemHashTags } =
    extractImportData(importData);

  if (
    isEmpty(settings) &&
    loadouts.length === 0 &&
    itemAnnotations.length === 0 &&
    triumphs.length === 0 &&
    searches.length === 0
  ) {
    badRequest(res, "Won't import empty data");
    return;
  }

  // Imports now work on a per-profile basis, and we won't touch a profile that
  // doesn't have any data in the incoming import. Note that settings are
  // handled differently because they are per-bungie-membership, not
  // per-profile. Importing will also always insert new records into postgres
  // regardless of the original migration state.

  const profileIdsToImport = new Set<string>();
  for (const loadout of loadouts) {
    profileIdsToImport.add(loadout.platformMembershipId);
  }
  for (const annotation of itemAnnotations) {
    profileIdsToImport.add(annotation.platformMembershipId);
  }
  for (const triumphData of triumphs) {
    profileIdsToImport.add(triumphData.platformMembershipId);
  }
  for (const search of searches) {
    if (search.platformMembershipId) {
      profileIdsToImport.add(search.platformMembershipId);
    }
  }
  for (const itemHashTag of itemHashTags) {
    if (itemHashTag.platformMembershipId) {
      profileIdsToImport.add(itemHashTag.platformMembershipId);
    }
  }

  // itemHashTag / searches have an old export format that doesn't include
  // profile ID. If we've made it this far and don't know the profiles in the
  // import, we have to assume we want to import to every profile.
  if (profileIdsToImport.size === 0 && (searches.length > 0 || itemHashTags.length > 0)) {
    for (const platformMembershipId of profileIds) {
      profileIdsToImport.add(platformMembershipId);
    }
  }

  for (const profileId of profileIdsToImport) {
    if (!profileIds.includes(profileId)) {
      badRequest(
        res,
        `Platform membership ID ${profileId} in import data is not associated with this user's Bungie.net account.`,
      );
      return;
    }
  }

  const response: ImportResponse = {
    loadouts: 0,
    tags: 0,
    triumphs: 0,
    searches: 0,
    itemHashTags: 0,
  };

  // Import settings
  await transaction(async (client) => replaceSettings(client, bungieMembershipId, settings));

  // Import profiles one by one
  for (const profileId of profileIdsToImport) {
    const dataForProfile = {
      loadouts: loadouts.filter((l) => l.platformMembershipId === profileId),
      itemAnnotations: itemAnnotations.filter((a) => a.platformMembershipId === profileId),
      triumphs: triumphs.filter((t) => t.platformMembershipId === profileId),
      searches: searches.filter(
        (s) => s.platformMembershipId === profileId || !s.platformMembershipId,
      ),
      itemHashTags: itemHashTags.filter(
        (h) => h.platformMembershipId === profileId || !h.platformMembershipId,
      ),
    };

    const doImport = async () => {
      const importResp = await importProfileData(bungieMembershipId, profileId, dataForProfile);
      response.loadouts += importResp.loadouts;
      response.tags += importResp.tags;
      response.triumphs += importResp.triumphs;
      response.searches += importResp.searches;
      response.itemHashTags += importResp.itemHashTags;
    };

    const migrationState = await transaction(async (client) =>
      getMigrationState(client, profileId),
    );

    if (migrationState.state === MigrationState.MigratingToPostgres) {
      badRequest(
        res,
        `Unable to import data for profile ${profileId} - migration in progress. Please wait a bit and try again.`,
      );
      return;
    }

    if (migrationState.state === MigrationState.Stately) {
      await doMigration(bungieMembershipId, profileId, doImport, async () =>
        deleteAllDataForUser(bungieMembershipId, [profileId]),
      );
    } else {
      await doImport();
    }
  }

  // default 200 OK
  res.status(200).send(response);
});

export function extractImportData(importData: ExportResponse) {
  const settings = extractSettings(importData);
  const loadouts = extractLoadouts(importData);
  const itemAnnotations = extractItemAnnotations(importData);
  const triumphs = importData.triumphs || [];
  const searches = extractSearches(importData);
  const itemHashTags = extractHashTags(importData);

  return {
    settings,
    loadouts,
    itemAnnotations,
    triumphs,
    searches,
    itemHashTags,
  };
}

export async function importProfileData(
  bungieMembershipId: number,
  platformMembershipId: string,
  {
    loadouts,
    itemAnnotations,
    triumphs,
    searches,
    itemHashTags,
  }: {
    loadouts: PlatformLoadout[];
    itemAnnotations: PlatformItemAnnotation[];
    triumphs: ExportResponse['triumphs'];
    searches: ExportResponse['searches'];
    itemHashTags: ItemHashTag[];
  },
): Promise<ImportResponse> {
  const response: ImportResponse = {
    loadouts: loadouts.length,
    tags: itemAnnotations.length,
    triumphs: triumphs.length,
    searches: searches.length,
    itemHashTags: itemHashTags.length,
  };

  const tagsDestinyVersions = new Set(itemAnnotations.map((a) => a.destinyVersion));
  const loadoutDestinyVersions = new Set(loadouts.map((l) => l.destinyVersion));
  const searchesDestinyVersions = new Set(searches.map((s) => s.destinyVersion));

  await transaction(async (client) => {
    // tags
    for (const destinyVersion of tagsDestinyVersions) {
      await softDeleteAllItemAnnotations(client, platformMembershipId, destinyVersion);
    }
    for (const annotation of itemAnnotations) {
      await updateItemAnnotation(
        client,
        bungieMembershipId,
        platformMembershipId,
        annotation.destinyVersion,
        annotation,
      );
    }

    // loadouts
    for (const destinyVersion of loadoutDestinyVersions) {
      await softDeleteAllLoadouts(client, platformMembershipId, destinyVersion);
    }
    for (const loadout of loadouts) {
      await updateLoadout(
        client,
        bungieMembershipId,
        platformMembershipId,
        loadout.destinyVersion,
        loadout,
      );
    }

    // triumphs
    for (const triumphData of triumphs) {
      await softDeleteAllTrackedTriumphs(client, platformMembershipId);
      for (const triumphHash of triumphData.triumphs) {
        await trackTriumph(client, bungieMembershipId, platformMembershipId, triumphHash);
      }
    }

    // searches
    for (const destinyVersion of searchesDestinyVersions) {
      await softDeleteAllSearches(client, platformMembershipId, destinyVersion);
    }
    for (const search of searches) {
      await importSearch(
        client,
        bungieMembershipId,
        platformMembershipId,
        search.destinyVersion,
        search.search.query,
        search.search.saved,
        search.search.lastUsage,
        search.search.usageCount,
        search.search.type,
      );
    }

    // item hash tags
    softDeleteAllItemHashTags(client, platformMembershipId);
    for (const itemHashTag of itemHashTags) {
      await updateItemHashTag(client, bungieMembershipId, platformMembershipId, itemHashTag);
    }
  });

  return response;
}

function extractSettings(importData: ExportResponse): Partial<Settings> {
  return subtractObject(importData.settings, defaultSettings);
}

type PlatformLoadout = Loadout & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

function extractLoadouts(importData: ExportResponse): PlatformLoadout[] {
  return (
    importData.loadouts?.map((l) => ({
      ...l.loadout,
      platformMembershipId: l.platformMembershipId,
      destinyVersion: l.destinyVersion,
    })) ?? []
  );
}

type PlatformItemAnnotation = ItemAnnotation & {
  platformMembershipId: string;
  destinyVersion: DestinyVersion;
};

function extractItemAnnotations(importData: ExportResponse): PlatformItemAnnotation[] {
  return (
    importData.tags?.map((t) => ({
      ...t.annotation,
      platformMembershipId: t.platformMembershipId,
      destinyVersion: t.destinyVersion || 2,
    })) ?? []
  );
}

function extractSearches(importData: ExportResponse): ExportResponse['searches'] {
  return (importData.searches || []).filter(
    // Filter out pre-filled searches that were never used
    (s) => s.search.usageCount > 0,
  );
}

type PlatformItemHashTag = ItemHashTag & {
  // For old exports, ItemHashTags won't have platformMembershipId
  platformMembershipId?: string;
};

function extractHashTags(importData: ExportResponse): PlatformItemHashTag[] {
  return (importData.itemHashTags || []).map((t) => {
    if (!('platformMembershipId' in t)) {
      return t;
    }
    return { ...t.itemHashTag, platformMembershipId: t.platformMembershipId };
  });
}

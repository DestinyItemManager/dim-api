import { isEmpty } from 'es-toolkit/compat';
import { doMigration } from '../../db/migration-state-queries.js';
import { pgExport } from '../../routes/export.js';
import { extractImportData, statelyImport } from '../../routes/import.js';

export async function migrateUser(bungieMembershipId: number): Promise<void> {
  const importToStately = async () => {
    // Export from Postgres
    const exportResponse = await pgExport(bungieMembershipId);

    const { settings, loadouts, itemAnnotations, triumphs, searches, itemHashTags } =
      extractImportData(exportResponse);

    const profileIds = new Set<string>();
    exportResponse.loadouts.forEach((l) => profileIds.add(l.platformMembershipId));
    exportResponse.tags.forEach((t) => profileIds.add(t.platformMembershipId));
    exportResponse.triumphs.forEach((t) => profileIds.add(t.platformMembershipId));

    if (
      isEmpty(settings) &&
      loadouts.length === 0 &&
      itemAnnotations.length === 0 &&
      triumphs.length === 0 &&
      searches.length === 0
    ) {
      // Nothing to import!
      return;
    }
    await statelyImport(
      bungieMembershipId,
      [...profileIds],
      settings,
      loadouts,
      itemAnnotations,
      triumphs,
      searches,
      itemHashTags,
      false,
    );
  };

  // For now let's leave the old data in Postgres as a backup
  await doMigration(bungieMembershipId, importToStately);
}

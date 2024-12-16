import { client } from './client.js';
import {
  deleteAllTrackedTriumphs,
  getTrackedTriumphsForProfile,
  trackUntrackTriumphs,
} from './triumphs-queries.js';

const platformMembershipId = '213512057';

beforeEach(async () => deleteAllTrackedTriumphs(platformMembershipId));

async function trackTriumph(platformMembershipId: string, triumphHash: number) {
  return client.transaction(async (txn) => {
    await trackUntrackTriumphs(txn, platformMembershipId, [
      { recordHash: triumphHash, tracked: true },
    ]);
  });
}
async function unTrackTriumph(platformMembershipId: string, triumphHash: number) {
  return client.transaction(async (txn) => {
    await trackUntrackTriumphs(txn, platformMembershipId, [
      { recordHash: triumphHash, tracked: false },
    ]);
  });
}

it('can track a triumph where none was tracked before', async () => {
  await trackTriumph(platformMembershipId, 3851137658);

  const triumphs = await getTrackedTriumphsForProfile(platformMembershipId);
  expect(triumphs[0]).toEqual(3851137658);
});

it('can track a triumph that was already tracked', async () => {
  await trackTriumph(platformMembershipId, 3851137658);

  await trackTriumph(platformMembershipId, 3851137658);

  const triumphs = await getTrackedTriumphsForProfile(platformMembershipId);
  expect(triumphs[0]).toEqual(3851137658);
});

it('can untrack a triumph', async () => {
  await trackTriumph(platformMembershipId, 3851137658);

  await unTrackTriumph(platformMembershipId, 3851137658);

  const triumphs = await getTrackedTriumphsForProfile(platformMembershipId);
  expect(triumphs.length).toEqual(0);
});

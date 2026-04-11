import { closeDbPool, transaction } from './index.js';
import {
  deleteAllTrackedTriumphs,
  getTrackedTriumphsForProfile,
  softDeleteAllTrackedTriumphs,
  trackTriumph,
  unTrackTriumph,
} from './triumphs-queries.js';

const platformMembershipId = '213512057';
const bungieMembershipId = 4321;

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllTrackedTriumphs(client, bungieMembershipId);
  }),
);

afterAll(async () => closeDbPool());

it('can track a triumph where none was tracked before', async () => {
  await transaction(async (client) => {
    await trackTriumph(client, bungieMembershipId, platformMembershipId, 3851137658);

    const triumphs = await getTrackedTriumphsForProfile(client, platformMembershipId);
    expect(triumphs[0]).toEqual(3851137658);
  });
});

it('can track a triumph that was already tracked', async () => {
  await transaction(async (client) => {
    await trackTriumph(client, bungieMembershipId, platformMembershipId, 3851137658);

    await trackTriumph(client, bungieMembershipId, platformMembershipId, 3851137658);

    const triumphs = await getTrackedTriumphsForProfile(client, platformMembershipId);
    expect(triumphs[0]).toEqual(3851137658);
  });
});

it('can untrack a triumph', async () => {
  await transaction(async (client) => {
    await trackTriumph(client, bungieMembershipId, platformMembershipId, 3851137658);

    await unTrackTriumph(client, platformMembershipId, 3851137658);

    const triumphs = await getTrackedTriumphsForProfile(client, platformMembershipId);
    expect(triumphs.length).toEqual(0);
  });
});

it('handles soft delete correctly', async () => {
  await transaction(async (client) => {
    await trackTriumph(client, bungieMembershipId, platformMembershipId, 3851137658);

    // Soft delete everything
    await softDeleteAllTrackedTriumphs(client, platformMembershipId);

    const triumphs = await getTrackedTriumphsForProfile(client, platformMembershipId);
    expect(triumphs.length).toBe(0);

    // Now re-track the same triumph - this should succeed and not create a duplicate
    await trackTriumph(client, bungieMembershipId, platformMembershipId, 3851137658);

    const triumphs2 = await getTrackedTriumphsForProfile(client, platformMembershipId);
    expect(triumphs2[0]).toEqual(3851137658);
  });
});

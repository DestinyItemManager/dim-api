import { transaction, pool } from '.';
import {
  getTrackedTriumphsForProfile,
  getAllTrackedTriumphsForUser,
  trackTriumph,
  unTrackTriumph,
  deleteAllTrackedTriumphs,
} from './triumphs-queries';

const appId = 'settings-queries-test-app';
const platformMembershipId = '213512057';
const bungieMembershipId = 4321;

beforeEach(() =>
  transaction(async (client) => {
    await deleteAllTrackedTriumphs(client, bungieMembershipId);
  })
);

afterAll(() => pool.end());

it('can track a triumph where none was tracked before', async () => {
  await transaction(async (client) => {
    await trackTriumph(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );

    const triumphs = await getTrackedTriumphsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId
    );
    expect(triumphs[0]).toEqual(3851137658);
  });
});

it('can track a triumph that was already tracked', async () => {
  await transaction(async (client) => {
    await trackTriumph(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );

    await trackTriumph(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );

    const triumphs = await getTrackedTriumphsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId
    );
    expect(triumphs[0]).toEqual(3851137658);
  });
});

it('can untrack a triumph', async () => {
  await transaction(async (client) => {
    await trackTriumph(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );

    await unTrackTriumph(
      client,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );

    const triumphs = await getTrackedTriumphsForProfile(
      client,
      bungieMembershipId,
      platformMembershipId
    );
    expect(triumphs.length).toEqual(0);
  });
});

it('can get all tracked triumphs across profiles', async () => {
  await transaction(async (client) => {
    await trackTriumph(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );
    await trackTriumph(client, appId, bungieMembershipId, '54321', 3851137658);

    await trackTriumph(
      client,
      appId,
      bungieMembershipId,
      platformMembershipId,
      3851137658
    );

    const triumphs = await getAllTrackedTriumphsForUser(
      client,
      bungieMembershipId
    );
    expect(triumphs.length).toEqual(2);
  });
});

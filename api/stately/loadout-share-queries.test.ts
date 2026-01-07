import { v4 as uuid } from 'uuid';
import { Loadout } from '../shapes/loadouts.js';
import {
  addLoadoutShare,
  deleteLoadoutShare,
  getLoadoutShare,
  recordAccess,
} from './loadout-share-queries.js';

const platformMembershipId = '213512057';

const shareID = 'ABCDEFG';

beforeEach(async () => deleteLoadoutShare(shareID));

const loadout: Loadout = {
  id: uuid(),
  name: 'Test Loadout',
  classType: 1,
  equipped: [
    {
      hash: 100,
      id: '1234',
      socketOverrides: { 7: 9 },
    },
  ],
  unequipped: [
    {
      hash: 200,
      id: '5678',
      amount: 10,
    },
  ],
};

it('can record a shared loadout', async () => {
  await addLoadoutShare(platformMembershipId, shareID, loadout);

  const sharedLoadout = await getLoadoutShare(shareID);

  expect(sharedLoadout?.name).toBe(loadout.name);
});

it('rejects multiple shares with the same ID', async () => {
  await addLoadoutShare(platformMembershipId, shareID, loadout);

  try {
    await addLoadoutShare(platformMembershipId, shareID, loadout);
    fail('Expected this to throw an error');
  } catch {}
});

it('can record visits', async () => {
  await addLoadoutShare(platformMembershipId, shareID, loadout);

  await recordAccess(shareID);
});

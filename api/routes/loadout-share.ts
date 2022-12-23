import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import base32 from 'hi-base32';
import slugify from 'slugify';
import { transaction } from '../db';
import { addLoadoutShare, getLoadoutShare, recordAccess } from '../db/loadout-share-queries';
import { metrics } from '../metrics';
import {
  GetSharedLoadoutResponse,
  LoadoutShareRequest,
  LoadoutShareResponse,
} from '../shapes/loadout-share';
import { Loadout } from '../shapes/loadouts';
import { validateLoadout } from './update';

// Prevent it translating pipe to "or"
slugify.extend({ '|': '-' });

const getShareURL = (loadout: Loadout, shareId: string) => {
  const titleSlug = slugify(loadout.name);
  return `https://dim.gg/${shareId}/${titleSlug}`;
};

/**
 * Save a loadout to be shared via a dim.gg link.
 */
export const loadoutShareHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;
  const { id: appId } = req.dimApp!;
  metrics.increment('loadout_share.app.' + appId, 1);
  const request = req.body as LoadoutShareRequest;
  const { platformMembershipId, loadout } = request;

  if (!platformMembershipId) {
    metrics.increment('loadout_share.validation.platformMembershipIdMissing.count');
    res.status(400).send({
      status: 'InvalidArgument',
      message: 'Loadouts require platform membership ID to be set',
    });
    return;
  }

  const validationResult = validateLoadout('loadout_share', loadout);
  if (validationResult) {
    res.status(400).send(validationResult);
  }

  const shareId = await transaction(async (client) => {
    const attempts = 0;
    // We'll make three attempts to guess a random non-colliding number
    while (attempts < 4) {
      const shareId = generateRandomShareId();
      try {
        await addLoadoutShare(
          client,
          appId,
          bungieMembershipId,
          platformMembershipId,
          shareId,
          loadout
        );
        return shareId;
      } catch (e) {
        // This is a unique constraint violation, generate another random share ID
        if (e.code == '23505') {
          // try again!
        } else {
          throw e;
        }
      }
    }
    if (attempts >= 4) {
      return 'ran-out';
    }
  });

  if (shareId === 'ran-out') {
    metrics.increment('loadout_share.ranOutOfAttempts.count');
    if (validationResult) {
      res.status(500).send({
        status: 'RanOutOfIDs',
        message: "We couldn't generate a share URL",
      });
      return;
    }
  }

  const result: LoadoutShareResponse = {
    shareUrl: getShareURL(loadout, shareId!),
  };

  res.send(result);
});

/**
 * Generate 4 random bytes (32 bits) and encode to base32url, which will yield 7 characters.
 *
 * Is this a particularly smart algorithm? No. Will it probably work until a
 * large number of accumulated loadouts forces us to do something better? Yes.
 */
function generateRandomShareId() {
  return base32.encode(crypto.randomBytes(4)).replace(/=/g, '').toLowerCase();
}

export const getLoadoutShareHandler = asyncHandler(async (req, res) => {
  const shareId = req.query.shareId as string;

  if (!shareId) {
    return;
  }

  await transaction(async (client) => {
    const loadout = await getLoadoutShare(client, shareId);
    if (loadout) {
      // Record when this was viewed and increment the view counter. Not using it much for now but I'd like to know.
      await recordAccess(client, shareId);

      const response: GetSharedLoadoutResponse = {
        loadout,
        shareUrl: getShareURL(loadout, shareId),
      };

      res.send(response);
    } else {
      res.status(404).send();
    }
  });
});

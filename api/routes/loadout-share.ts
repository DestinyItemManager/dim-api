import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import base32 from 'hi-base32';
import { DatabaseError } from 'pg-protocol';
import { transaction } from '../db/index.js';
import { addLoadoutShare, getLoadoutShare, recordAccess } from '../db/loadout-share-queries.js';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import {
  GetSharedLoadoutResponse,
  LoadoutShareRequest,
  LoadoutShareResponse,
} from '../shapes/loadout-share.js';
import { Loadout } from '../shapes/loadouts.js';
import { UserInfo } from '../shapes/user.js';
import slugify from './slugify.js';
import { validateLoadout } from './update.js';

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
  const { bungieMembershipId } = req.user as UserInfo;
  const { id: appId } = req.dimApp as ApiApp;
  metrics.increment(`loadout_share.app.${appId}`, 1);
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
    return;
  }

  const shareId = await transaction(async (client) => {
    let attempts = 0;
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
          loadout,
        );
        return shareId;
      } catch (e) {
        // This is a unique constraint violation, generate another random share ID
        if (e instanceof DatabaseError && e.code === '23505') {
          // try again!
        } else {
          throw e;
        }
      }
      attempts++;
    }
    return 'ran-out';
  });

  if (shareId === 'ran-out') {
    metrics.increment('loadout_share.ranOutOfAttempts.count');
    res.status(500).send({
      status: 'RanOutOfIDs',
      message: "We couldn't generate a share URL",
    });
    return;
  }

  const result: LoadoutShareResponse = {
    shareUrl: getShareURL(loadout, shareId),
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

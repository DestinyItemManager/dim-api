import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import base32 from 'hi-base32';
import { transaction } from '../db/index.js';
import { getLoadoutShare, recordAccess } from '../db/loadout-share-queries.js';
import { metrics } from '../metrics/index.js';
import { ApiApp } from '../shapes/app.js';
import {
  GetSharedLoadoutResponse,
  LoadoutShareRequest,
  LoadoutShareResponse,
} from '../shapes/loadout-share.js';
import { Loadout } from '../shapes/loadouts.js';
import { UserInfo } from '../shapes/user.js';
import {
  addLoadoutShare as addLoadoutShareStately,
  getLoadoutShare as getLoadoutShareStately,
  LoadoutShareCollision,
  recordAccess as recordAccessStately,
} from '../stately/loadout-share-queries.js';
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
  const { profileIds } = req.user as UserInfo;
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
  } else if (!profileIds.includes(platformMembershipId)) {
    metrics.increment('loadout_share.validation.platformMembershipIdMismatch.count');
    res.status(400).send({
      status: 'InvalidArgument',
      message: 'Loadouts must be for the currently authenticated user',
    });
  }

  const validationResult = validateLoadout('loadout_share', loadout);
  if (validationResult) {
    res.status(400).send(validationResult);
    return;
  }

  let shareId = '';
  let attempts = 0;
  // We'll make three attempts to guess a random non-colliding number
  while (attempts < 4) {
    shareId = generateRandomShareId();
    try {
      await addLoadoutShareStately(platformMembershipId, shareId, loadout);
      break;
    } catch (e) {
      // This is a unique constraint violation, generate another random share ID
      if (e instanceof LoadoutShareCollision) {
        // try again!
      } else {
        throw e;
      }
    }
    attempts++;
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

  const loadout = await loadLoadoutShare(shareId);
  if (loadout) {
    const response: GetSharedLoadoutResponse = {
      loadout,
      shareUrl: getShareURL(loadout, shareId),
    };

    res.send(response);
  } else {
    res.status(404).send();
  }
});

export async function loadLoadoutShare(shareId: string) {
  // First look in Stately
  try {
    const loadout = await getLoadoutShareStately(shareId);
    if (loadout) {
      // Record when this was viewed and increment the view counter. Not using it much for now but I'd like to know.
      await recordAccessStately(shareId);
      return loadout;
    }
  } catch (e) {
    console.error('Failed to load loadout share from Stately', e);
  }

  // Fall back to Postgres
  return transaction(async (client) => {
    const loadout = await getLoadoutShare(client, shareId);
    if (loadout) {
      // Record when this was viewed and increment the view counter. Not using it much for now but I'd like to know.
      await recordAccess(client, shareId);
    }
    return loadout;
  });
}

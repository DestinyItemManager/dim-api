import { Response } from 'express';
import _ from 'lodash';
import { metrics } from './metrics';

export function camelize<T extends object>(data: object) {
  return _.mapKeys(data, (_value, key) => _.camelCase(key)) as T;
}

export function badRequest(res: Response, message: string) {
  res.status(400).send({
    error: 'InvalidRequest',
    message,
  });
}

/**
 * Check whether this could be a real instanced inventory item (just a sequence of numbers)
 */
export function isValidItemId(inventoryItemId: string) {
  return isNumberSequence(inventoryItemId);
}

/**
 * Check whether this could be a real instanced inventory item (just a sequence of numbers)
 */
export function isValidPlatformMembershipId(platformMembershipId: string) {
  return isNumberSequence(platformMembershipId);
}

function isNumberSequence(str: string) {
  return /^\d{1,32}$/.test(str);
}

/**
 * Check whether the platform membership ID provided is in the JWT's list of profile IDs.
 */
export function checkPlatformMembershipId(
  platformMembershipId: string | undefined,
  profileIds: string[],
  metricsPrefix: string
) {
  // For now, don't enforce that the JWT includes profile IDs, but track whether they would
  if (platformMembershipId) {
    if (profileIds.length) {
      metrics.increment(
        metricsPrefix +
          '.profileIds.' +
          (profileIds.includes(platformMembershipId) ? 'match' : 'noMatch') +
          '.count',
        1
      );
    } else {
      metrics.increment(metricsPrefix + '.profileIds.missing.count', 1);
    }
  }
}

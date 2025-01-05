import asyncHandler from 'express-async-handler';
import { UserInfo } from '../shapes/user.js';
import { deleteAllDataForUser } from '../stately/bulk-queries.js';

/**
 * Delete My Data - this allows a user to wipe all their data from DIM storage.
 */
export const deleteAllDataHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  const result = await deleteAllDataForUser(bungieMembershipId, profileIds);

  // default 200 OK
  res.status(200).send({
    deleted: result,
  });
});

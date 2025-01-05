import asyncHandler from 'express-async-handler';
import { UserInfo } from '../shapes/user.js';
import { exportDataForUser } from '../stately/bulk-queries.js';

export const exportHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId, profileIds } = req.user as UserInfo;

  const response = await exportDataForUser(bungieMembershipId, profileIds);

  // Instruct CF not to cache this
  res.set('Cache-Control', 'no-cache, no-store, max-age=0');
  res.send(response);
});

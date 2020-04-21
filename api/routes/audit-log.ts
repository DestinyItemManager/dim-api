import asyncHandler from 'express-async-handler';
import { readTransaction } from '../db';
import { getAuditLog } from '../db/audit-log-queries';
import { AuditLogResponse } from '../shapes/audit-log';

export const auditLogHandler = asyncHandler(async (req, res) => {
  const { bungieMembershipId } = req.user!;

  await readTransaction(async (client) => {
    const auditLog = await getAuditLog(client, bungieMembershipId);

    const response: AuditLogResponse = {
      log: auditLog,
    };

    // Instruct CF not to cache this
    res.set('Cache-Control', 'no-cache, max-age=0');
    res.send(response);
  });
});

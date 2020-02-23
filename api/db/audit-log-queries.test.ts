import { transaction, pool } from '.';
import { recordAuditLog, getAuditLog } from './audit-log-queries';
import { AuditLogEntry } from '../shapes/audit-log';

const appId = 'settings-queries-test-app';
const platformMembershipId = '213512057';
const bungieMembershipId = 1234;

beforeEach(async () => {
  await pool.query({
    text: 'delete from audit_log where membership_id = $1',
    values: [bungieMembershipId]
  });
});

it('can insert audit logs', async () => {
  await transaction(async (client) => {
    const entry: AuditLogEntry = {
      type: 'tag_cleanup',
      platformMembershipId,
      destinyVersion: 2,
      payload: {},
      createdBy: appId
    };
    await recordAuditLog(client, bungieMembershipId, entry);

    const logs = await getAuditLog(client, bungieMembershipId);

    entry.createdAt = logs[0].createdAt;
    expect(logs[0]).toEqual(entry);
  });
});

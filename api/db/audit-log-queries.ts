import { ClientBase, QueryResult } from 'pg';
import { AuditLogEntry } from '../shapes/audit-log';

/**
 * Get the audit log for an account.
 */
export async function getAuditLog(
  client: ClientBase,
  bungieMembershipId: number
): Promise<AuditLogEntry[]> {
  const results = await client.query({
    name: 'get_audit_log',
    text:
      'SELECT platform_membership_id, destiny_version, type, entry, created_at, created_by FROM audit_log WHERE membership_id = $1 ORDER BY created_at desc, id desc LIMIT 100',
    values: [bungieMembershipId],
  });
  return results.rows.map(convertAuditLog);
}

function convertAuditLog(row: any): AuditLogEntry {
  const entry: AuditLogEntry = {
    platformMembershipId: row.platform_membership_id,
    destinyVersion: row.destiny_version || 2,
    type: row.type,
    payload: row.entry,
    createdAt: row.created_at.getTime(),
    createdBy: row.created_by,
  };
  return entry;
}

/**
 * Add an audit log entry
 */
export async function recordAuditLog(
  client: ClientBase,
  bungieMembershipId: number,
  entry: AuditLogEntry
): Promise<QueryResult<any>> {
  const response = await client.query({
    name: 'add_audit_log',
    text: `insert into audit_log (membership_id, platform_membership_id, destiny_version, type, entry, created_by)
values ($1, $2, $3, $4, $5, $6)`,
    values: [
      bungieMembershipId,
      entry.platformMembershipId,
      entry.destinyVersion || 2,
      entry.type,
      entry.payload,
      entry.createdBy,
    ],
  });

  return response;
}

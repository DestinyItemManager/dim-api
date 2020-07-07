import { Settings } from './settings';
import { ItemAnnotation, ItemHashTag } from './item-annotations';
import { DestinyVersion } from './general';
import { DeleteAllResponse } from './delete-all';
import { TrackTriumphUpdate } from './profile';

export interface AuditLogResponse {
  log: AuditLogEntry[];
}

/**
 * Audit logs keep track of actions made by a user. We save enough info to display some data.
 */

export type AuditLogEntry = {
  platformMembershipId?: string;
  destinyVersion?: DestinyVersion;
  createdAt?: number;
  createdBy: string;
} & (
  | ImportAuditLogEntry
  | DeleteAllLogEntry
  | SettingsLogEntry
  | LoadoutLogEntry
  | DeleteLoadoutLogEntry
  | ItemAnnotationLogEntry
  | ItemHashTagLogEntry
  | CleanupItemAnnotationLogEntry
  | TrackTriumphLogEntry
  | AuthLogEntry
);

export interface ImportAuditLogEntry {
  type: 'import';
  // How much was imported?
  payload: {
    loadouts: number;
    tags: number;
    triumphs: number;
    itemHashTags: number;
  };
}

// This is all we'll record about a user once they've asked to delete all data.
export interface DeleteAllLogEntry {
  type: 'delete_all';
  payload: DeleteAllResponse['deleted'];
}

export interface SettingsLogEntry {
  type: 'settings';
  payload: Partial<Settings>;
}

export interface LoadoutLogEntry {
  type: 'loadout';
  payload: {
    /** Loadout name */
    name: string;
  };
}

export interface DeleteLoadoutLogEntry {
  type: 'delete_loadout';
  payload: {
    /** Loadout name */
    name: string;
  };
}

export interface ItemAnnotationLogEntry {
  type: 'tag';
  payload: ItemAnnotation;
}

export interface ItemHashTagLogEntry {
  type: 'item_hash_tag';
  payload: ItemHashTag;
}

export interface CleanupItemAnnotationLogEntry {
  type: 'tag_cleanup';
  payload: {
    deleted: number;
  };
}

export interface TrackTriumphLogEntry {
  type: 'track_triumph';
  payload: TrackTriumphUpdate['payload'];
}

export interface AuthLogEntry {
  type: 'auth';
  payload: {
    userAgent: string;
  };
}

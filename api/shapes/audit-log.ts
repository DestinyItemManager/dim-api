import { Settings } from './settings';
import { ItemAnnotation } from './item-annotations';
import { DestinyVersion } from './general';

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
  | CleanupItemAnnotationLogEntry
);

export interface ImportAuditLogEntry {
  type: 'import';
  // How much was imported?
  payload: {
    loadouts: number;
    tags: number;
  };
}

// This is all we'll record about a user once they've asked to delete all data.
export interface DeleteAllLogEntry {
  type: 'delete_all';
  payload: {};
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

export interface CleanupItemAnnotationLogEntry {
  type: 'tag_cleanup';
  payload: {};
}

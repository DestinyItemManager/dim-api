import { Settings } from './settings';
import { Loadout } from './loadouts';
import { ItemAnnotation, ItemHashTag } from './item-annotations';
import { DestinyVersion } from './general';
import { Search } from './search';

export interface ProfileResponse {
  settings?: Settings;
  loadouts?: Loadout[];
  tags?: ItemAnnotation[];
  /** Tags for shaders and other uninstanced items */
  itemHashTags?: ItemHashTag[];
  /** Hashes of tracked triumphs */
  triumphs?: number[];
  searches?: Search[];
}

/**
 * A list of updates for a particular profile.
 */
export interface ProfileUpdateRequest {
  platformMembershipId?: string;
  destinyVersion?: DestinyVersion;
  updates: ProfileUpdate[];
}

export interface ProfileUpdateResponse {
  results: ProfileUpdateResult[];
}

export type ProfileUpdate =
  | TagUpdate
  | ItemHashTagUpdate
  | TagCleanupUpdate
  | SettingUpdate
  | LoadoutUpdate
  | DeleteLoadoutUpdate
  | TrackTriumphUpdate
  | UsedSearchUpdate
  | SavedSearchUpdate
  | DeleteSearchUpdate;

export interface TagUpdate {
  action: 'tag';
  payload: ItemAnnotation;
}

export interface ItemHashTagUpdate {
  action: 'item_hash_tag';
  payload: ItemHashTag;
}

export interface TagCleanupUpdate {
  action: 'tag_cleanup';
  payload: string[]; // Item instance IDs to delete
}

export interface SettingUpdate {
  action: 'setting';
  payload: Partial<Settings>;
  // TODO: add a param to indicate whether it's the first time so we can try just updating?
}

export interface LoadoutUpdate {
  action: 'loadout';
  payload: Loadout;
}

export interface DeleteLoadoutUpdate {
  action: 'delete_loadout';
  payload: string; // A loadout ID
}

export interface TrackTriumphUpdate {
  action: 'track_triumph';
  /** true for tracked, false for untracked */
  payload: {
    recordHash: number;
    tracked: boolean;
  };
}

/**
 * Record that a search was used.
 */
export interface UsedSearchUpdate {
  action: 'search';
  payload: {
    query: string;
  };
}

/**
 * Save or unsave a search. This is separate from marking a search as used.
 */
export interface SavedSearchUpdate {
  action: 'save_search';
  payload: {
    query: string;
    /**
     * Whether the search should be saved
     */
    saved: boolean;
  };
}

/**
 * Delete a search. This allows for "forgetting" a recent or saved search.
 */
export interface DeleteSearchUpdate {
  action: 'delete_search';
  payload: {
    query: string;
  };
}

export interface ProfileUpdateResponse {
  results: ProfileUpdateResult[];
}

export interface ProfileUpdateResult {
  status: 'Success' | string;
  message?: string;
}

import { DestinyVersion } from './general.js';
import { ItemAnnotation, ItemHashTag } from './item-annotations.js';
import { Loadout } from './loadouts.js';
import { Search, SearchType } from './search.js';
import { Settings } from './settings.js';

export interface ProfileResponse {
  settings?: Settings;
  loadouts?: Loadout[];
  tags?: ItemAnnotation[];
  /** Tags for shaders and other uninstanced items */
  itemHashTags?: ItemHashTag[];
  /** Hashes of tracked triumphs */
  triumphs?: number[];
  searches?: Search[];

  /** If the response is a sync, this will include loadout IDs of deleted loadouts. */
  deletedLoadoutIds?: string[];
  /** If the response is a sync, this will include MD5 hashes of deleted search queries. */
  deletedSearchHashes?: string[];
  /** If the response is a sync, this will include triumph hashes of untracked triumphs. */
  deletedTriumphs?: number[];
  /** If the response is a sync, this will include instance IDs of deleted tags. */
  deletedTagsIds?: string[];
  /** If the response is a sync, this will include hashes of deleted item hash tags. */
  deletedItemHashTagHashes?: number[];

  /** Set to true if this response only contains new/changed/deleted items. */
  sync?: boolean;

  /**
   * This token allows for syncing the profile after the initial load. If you
   * provide it as the `sync=` query parameter, the server will return only
   * changed items made since the last sync.
   */
  syncToken?: string;
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
    type: SearchType;
  };
}

/**
 * Save or unsave a search. This is separate from marking a search as used.
 */
export interface SavedSearchUpdate {
  action: 'save_search';
  payload: {
    query: string;
    type: SearchType;
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
    type: SearchType;
  };
}

export interface ProfileUpdateResponse {
  results: ProfileUpdateResult[];
}

export interface ProfileUpdateResult {
  status: 'Success' | string;
  message?: string;
}

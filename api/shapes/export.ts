import { DestinyVersion } from './general.js';
import { ItemAnnotation, ItemHashTag } from './item-annotations.js';
import { Loadout } from './loadouts.js';
import { Search } from './search.js';
import { Settings } from './settings.js';

export interface ExportResponse {
  settings: Partial<Settings>;
  loadouts: {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    loadout: Loadout;
  }[];
  tags: {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    annotation: ItemAnnotation;
  }[];
  itemHashTags: ItemHashTag[];
  triumphs: {
    platformMembershipId: string;
    triumphs: number[];
  }[];
  searches: {
    destinyVersion: DestinyVersion;
    search: Search;
  }[];
}

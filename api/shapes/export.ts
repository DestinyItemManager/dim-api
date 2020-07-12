import { Settings } from './settings';
import { ItemAnnotation, ItemHashTag } from './item-annotations';
import { DestinyVersion } from './general';
import { Loadout } from './loadouts';

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
}

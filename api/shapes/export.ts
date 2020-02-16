import { Settings } from './settings';
import { ItemAnnotation } from './item-annotations';
import { DestinyVersion } from './general';
import { Loadout } from './loadouts';

export interface ExportResponse {
  settings: Settings;
  loadouts: {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    loadout: Loadout;
  }[];
  tags: {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    annotation: ItemAnnotation;
  };
}

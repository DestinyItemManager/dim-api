import { Loadout } from './loadouts';

/**
 * A loadout to share.
 */
export interface LoadoutShareRequest {
  /** Platform (and authentication) is required to know who shared the loadout. */
  platformMembershipId: string;
  /** A complete loadout object to share. */
  loadout: Loadout;
}

export interface LoadoutShareResponse {
  /** The full dim.gg URL to the shared loadout. */
  shareUrl: string;
}

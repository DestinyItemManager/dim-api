export interface UserInfo {
  /** The user's Bungie.net membership ID, from the JWT */
  bungieMembershipId: number;
  /** The DIM App API key this token was issued for */
  dimApiKey: string;
  /** A list of Destiny 2 membership profiles this account can access. */
  profileIds: string[];
}

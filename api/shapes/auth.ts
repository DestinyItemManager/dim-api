export interface AuthTokenRequest {
  /** The access token from authenticating with the Bungie.net API */
  bungieAccessToken: string;
  /** The user's Bungie.net membership ID */
  membershipId: string;
}

export interface AuthTokenResponse {
  /** Your DIM API access token, to be used in further requests. */
  accessToken: string;
  /** How many seconds from now the token will expire. */
  expiresInSeconds: number;
}

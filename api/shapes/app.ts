/**
 * An app registered with the DIM API.
 */
export interface ApiApp {
  /** A short ID that uniquely identifies the app. */
  id: string;
  /** Apps must share their Bungie.net API key with us. */
  bungieApiKey: string;
  /** Apps also get a generated API key for accessing DIM APIs that don't involve user data. */
  dimApiKey: string;
  /** The origin used to allow CORS for this app. Only requests from this origin are allowed. */
  origin: string;
}

/**
 * A request to register a new app with the DIM API.
 */
export type CreateAppRequest = Pick<ApiApp, 'id' | 'bungieApiKey' | 'origin'>;

export interface CreateAppResponse {
  app: ApiApp;
}

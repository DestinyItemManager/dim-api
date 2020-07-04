export interface DeleteAllResponse {
  deleted: {
    settings: number;
    loadouts: number;
    tags: number;
    triumphs: number;
    searches: number;
  };
}

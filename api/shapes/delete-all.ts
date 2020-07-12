export interface DeleteAllResponse {
  deleted: {
    settings: number;
    loadouts: number;
    tags: number;
    itemHashTags: number;
    triumphs: number;
    searches: number;
  };
}

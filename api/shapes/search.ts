export const enum SearchType {
  Item = 1,
  Loadout = 2,
}

/**
 * A search query. This can either be from history (recent searches), pinned (saved searches), or suggested.
 */
export interface Search {
  query: string;
  /**
   * A zero usage count means this is a suggested/preloaded search.
   */
  usageCount: number;
  /**
   * Has this search been saved/favorited/pinned by the user?
   */
  saved: boolean;
  /**
   * The last time this was used, as a unix millisecond timestamp.
   */
  lastUsage: number;
  /**
   * Which kind of thing is this search for? Searches of different types are
   * stored together and need to be filtered to the specific type.
   */
  type: SearchType;
}

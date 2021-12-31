/** Compatible superset of Little Light wishlist format */

interface WishList {
  name: string;
  description: string;
  includes: string[];
  // Per-item-hash rolls
  data: ItemRoll[];
  // Global rolls that just match plugs, not items
  globalRolls: Roll[];
  // Rolls that are specific to whole categories of items rather than specific items.
  categoryRolls: CategoryRoll[];
}

/** These tags are meant to match the Little Light JSON wishlist tags. */
type Tag =
  | "PVE"
  | "PVP"
  | "GodPVE"
  | "GodPVP"
  | "Mouse"
  | "Controller"
  // Users are free to specify any other tag
  | string;
// A "grade" or "tier" of the roll. The idea is we could let people subscribe to a particular subset of tiers.
type Grade = "s" | "a" | "b" | "c" | "d" | "f";

// TODO: should we try to reduce the size of this?
interface Roll {
  name?: string; // Not used in DIM
  description?: string; // e.g. notes
  plugs: number[][];
  // Can be used to filter which rolls to show!
  tags?: Tag[];
  // These could also be tags? I like having a defined scale though.
  grade?: Grade;
  trash?: boolean; // Should this just be grade?
}

interface ItemRoll extends Roll {
  hash: number;
}

interface CategoryRoll extends Roll {
  categories: number[];
}

/**
 * {
    "description": "bar",
    "name": "foo",
    "data": [
        {
            "description": "Bazaar?",
            "hash": 602618796,
            "name": "Fooo?",
            "plugs": [
                [
                    4090651448,
                    1467527085,
                    1840239774
                ],
                [
                    3142289711,
                    2420895100
                ],
                [
                    2946784966
                ]
            ],
            "tags": [
                "GodPVE",
                "Mouse"
            ]
        }
    ]
}
 */

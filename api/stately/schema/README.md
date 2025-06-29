# DIM (Destiny Item Manager) Schema

These are the objects that DIM stores in its own service - most data comes from Bungie's Destiny API, but certain amendments (custom tags, loadouts, etc.) are provided directly by DIM because they're not part of the game.

Key paths are laid out like this:

- `/apps/app-:id`: `ApiApp`
- `/gs-:stage`: `GlobalSettings`
- `/loadoutShare-:id`: `LoadoutShare`
- `/member-:memberId/settings`: `Settings`
- `/p-:profileId`
  - `/d-:destinyVersion`
    - `/ia-:id`: `ItemAnnotation`
    - `/iht-:hash`: `ItemHashTag`
    - `/loadout-:id`: `Loadout`
    - `/search-:qhash`: `Search`
    - `/triumph-:recordHash`: `Triumph`
    - `/wl-:wishlistId`: `WishListInfo`
- `/wl-:wishlistId`: `WishListInfo` (uuid? rand?)
  - `/e-:wishlistEntry`: `WishListEntry`

The goal with this modeling is to allow for syncing all of a user's info in two StatelyDB operations:

- `List("/p-:profileId/d-:destinyVersion")` - get all saved data for a particular game profile + destiny version (each profile can be associated with Destiny 1 and Destiny 2)
- `List("/member-:memberId")` - get settings for a whole Bungie.net account. It's a List instead of a Get so we can sync it!

Plus some fun stuff such as:

- `List("/apps/")` to get all registered apps, and `SyncList()` to keep them up to date.

# Schema Info

This is an auto-generated README file to help you understand your schema!

* SchemaID => `8030842688320564`
* Schema Version => `8`
* See schema on the [Stately Console](https://console.stately.cloud/1org/schemas/8030842688320564).

### Key Path Layout

| Group             | Key Path             | Item Type      | primary | required | syncable | txn type |
|:------------------|:---------------------|:---------------|:--------|:---------|:---------|:---------|
| `/apps-*`         | `/apps-*/app-*`      | ApiApp         | Yes     | Yes      | Yes      | group    |
| `/gs-*`           | `/gs-*`              | GlobalSettings | Yes     | Yes      | Yes      | group    |
| `/loadoutShare-*` | `/loadoutShare-*`    | LoadoutShare   | Yes     | Yes      | Yes      | group    |
| `/member-*`       | `/member-*/settings` | Settings       | Yes     | Yes      | Yes      | group    |
| `/p-*`            | `/p-*/d-*/ia-*`      | ItemAnnotation | Yes     | Yes      | Yes      | group    |
| `/p-*`            | `/p-*/d-*/iht-*`     | ItemHashTag    | Yes     | Yes      | Yes      | group    |
| `/p-*`            | `/p-*/d-*/loadout-*` | Loadout        | Yes     | Yes      | Yes      | group    |
| `/p-*`            | `/p-*/d-*/search-*`  | Search         | Yes     | Yes      | Yes      | group    |
| `/p-*`            | `/p-*/d-*/triumph-*` | Triumph        | Yes     | Yes      | Yes      | group    |

### TODO:

What else should we add here? Let us know!

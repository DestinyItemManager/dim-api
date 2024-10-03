// @generated by protoc-gen-es v2.0.0 with parameter "target=js+dts,import_extension=.js"
// @generated from file index.proto (package stately.generated, syntax proto3)
/* eslint-disable */

import type { GenEnum, GenFile, GenMessage } from "@bufbuild/protobuf/codegenv1";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file index.proto.
 */
export declare const file_index: GenFile;

/**
 * @generated from message stately.generated.ApiApp
 */
export declare type ApiApp = Message<"stately.generated.ApiApp"> & {
  /**
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * @generated from field: string bungieApiKey = 2;
   */
  bungieApiKey: string;

  /**
   * @generated from field: string dimApiKey = 3;
   */
  dimApiKey: string;

  /**
   * @generated from field: string origin = 4;
   */
  origin: string;

  /**
   * @generated from field: uint64 partition = 5;
   */
  partition: bigint;
};

/**
 * Describes the message stately.generated.ApiApp.
 * Use `create(ApiAppSchema)` to create a new message.
 */
export declare const ApiAppSchema: GenMessage<ApiApp>;

/**
 * @generated from message stately.generated.ArtifactUnlocks
 */
export declare type ArtifactUnlocks = Message<"stately.generated.ArtifactUnlocks"> & {
  /**
   * @generated from field: repeated uint32 unlockedItemHashes = 1;
   */
  unlockedItemHashes: number[];

  /**
   * @generated from field: uint32 seasonNumber = 2;
   */
  seasonNumber: number;
};

/**
 * Describes the message stately.generated.ArtifactUnlocks.
 * Use `create(ArtifactUnlocksSchema)` to create a new message.
 */
export declare const ArtifactUnlocksSchema: GenMessage<ArtifactUnlocks>;

/**
 * @generated from message stately.generated.CollapsedSection
 */
export declare type CollapsedSection = Message<"stately.generated.CollapsedSection"> & {
  /**
   * @generated from field: string key = 1;
   */
  key: string;

  /**
   * @generated from field: bool collapsed = 2;
   */
  collapsed: boolean;
};

/**
 * Describes the message stately.generated.CollapsedSection.
 * Use `create(CollapsedSectionSchema)` to create a new message.
 */
export declare const CollapsedSectionSchema: GenMessage<CollapsedSection>;

/**
 * @generated from message stately.generated.CustomStatDef
 */
export declare type CustomStatDef = Message<"stately.generated.CustomStatDef"> & {
  /**
   * @generated from field: uint32 statHash = 1;
   */
  statHash: number;

  /**
   * @generated from field: string label = 2;
   */
  label: string;

  /**
   * @generated from field: string shortLabel = 3;
   */
  shortLabel: string;

  /**
   * @generated from field: stately.generated.DestinyClass class = 4;
   */
  class: DestinyClass;

  /**
   * @generated from field: repeated stately.generated.CustomStatWeightsEntry weights = 5;
   */
  weights: CustomStatWeightsEntry[];
};

/**
 * Describes the message stately.generated.CustomStatDef.
 * Use `create(CustomStatDefSchema)` to create a new message.
 */
export declare const CustomStatDefSchema: GenMessage<CustomStatDef>;

/**
 * @generated from message stately.generated.CustomStatWeightsEntry
 */
export declare type CustomStatWeightsEntry = Message<"stately.generated.CustomStatWeightsEntry"> & {
  /**
   * @generated from field: uint32 statHash = 1;
   */
  statHash: number;

  /**
   * @generated from field: double weight = 2;
   */
  weight: number;
};

/**
 * Describes the message stately.generated.CustomStatWeightsEntry.
 * Use `create(CustomStatWeightsEntrySchema)` to create a new message.
 */
export declare const CustomStatWeightsEntrySchema: GenMessage<CustomStatWeightsEntry>;

/**
 * @generated from message stately.generated.CustomStatsEntry
 */
export declare type CustomStatsEntry = Message<"stately.generated.CustomStatsEntry"> & {
  /**
   * @generated from field: stately.generated.DestinyClass classType = 1;
   */
  classType: DestinyClass;

  /**
   * @generated from field: repeated uint32 customStats = 2;
   */
  customStats: number[];
};

/**
 * Describes the message stately.generated.CustomStatsEntry.
 * Use `create(CustomStatsEntrySchema)` to create a new message.
 */
export declare const CustomStatsEntrySchema: GenMessage<CustomStatsEntry>;

/**
 * @generated from message stately.generated.GlobalSettings
 */
export declare type GlobalSettings = Message<"stately.generated.GlobalSettings"> & {
  /**
   * @generated from field: string stage = 1;
   */
  stage: string;

  /**
   * @generated from field: bool dimApiEnabled = 2;
   */
  dimApiEnabled: boolean;

  /**
   * @generated from field: sint64 destinyProfileMinimumRefreshInterval = 3;
   */
  destinyProfileMinimumRefreshInterval: bigint;

  /**
   * @generated from field: sint64 destinyProfileRefreshInterval = 4;
   */
  destinyProfileRefreshInterval: bigint;

  /**
   * @generated from field: bool autoRefresh = 5;
   */
  autoRefresh: boolean;

  /**
   * @generated from field: bool refreshProfileOnVisible = 6;
   */
  refreshProfileOnVisible: boolean;

  /**
   * @generated from field: sint64 dimProfileMinimumRefreshInterval = 7;
   */
  dimProfileMinimumRefreshInterval: bigint;

  /**
   * @generated from field: bool showIssueBanner = 8;
   */
  showIssueBanner: boolean;

  /**
   * @generated from field: sint64 lastUpdated = 9;
   */
  lastUpdated: bigint;
};

/**
 * Describes the message stately.generated.GlobalSettings.
 * Use `create(GlobalSettingsSchema)` to create a new message.
 */
export declare const GlobalSettingsSchema: GenMessage<GlobalSettings>;

/**
 * @generated from message stately.generated.InGameLoadoutIdentifiers
 */
export declare type InGameLoadoutIdentifiers = Message<"stately.generated.InGameLoadoutIdentifiers"> & {
  /**
   * @generated from field: uint32 colorHash = 1;
   */
  colorHash: number;

  /**
   * @generated from field: uint32 iconHash = 2;
   */
  iconHash: number;

  /**
   * @generated from field: uint32 nameHash = 3;
   */
  nameHash: number;
};

/**
 * Describes the message stately.generated.InGameLoadoutIdentifiers.
 * Use `create(InGameLoadoutIdentifiersSchema)` to create a new message.
 */
export declare const InGameLoadoutIdentifiersSchema: GenMessage<InGameLoadoutIdentifiers>;

/**
 * @generated from message stately.generated.ItemAnnotation
 */
export declare type ItemAnnotation = Message<"stately.generated.ItemAnnotation"> & {
  /**
   * @generated from field: uint64 profileId = 1;
   */
  profileId: bigint;

  /**
   * @generated from field: uint32 destinyVersion = 2;
   */
  destinyVersion: number;

  /**
   * @generated from field: stately.generated.TagValue tag = 3;
   */
  tag: TagValue;

  /**
   * @generated from field: string notes = 4;
   */
  notes: string;

  /**
   * @generated from field: uint64 id = 5;
   */
  id: bigint;

  /**
   * @generated from field: sint64 craftedDate = 6;
   */
  craftedDate: bigint;
};

/**
 * Describes the message stately.generated.ItemAnnotation.
 * Use `create(ItemAnnotationSchema)` to create a new message.
 */
export declare const ItemAnnotationSchema: GenMessage<ItemAnnotation>;

/**
 * @generated from message stately.generated.ItemHashTag
 */
export declare type ItemHashTag = Message<"stately.generated.ItemHashTag"> & {
  /**
   * @generated from field: uint64 profileId = 1;
   */
  profileId: bigint;

  /**
   * @generated from field: uint32 destinyVersion = 2;
   */
  destinyVersion: number;

  /**
   * @generated from field: stately.generated.TagValue tag = 3;
   */
  tag: TagValue;

  /**
   * @generated from field: string notes = 4;
   */
  notes: string;

  /**
   * @generated from field: uint32 hash = 5;
   */
  hash: number;
};

/**
 * Describes the message stately.generated.ItemHashTag.
 * Use `create(ItemHashTagSchema)` to create a new message.
 */
export declare const ItemHashTagSchema: GenMessage<ItemHashTag>;

/**
 * @generated from message stately.generated.Loadout
 */
export declare type Loadout = Message<"stately.generated.Loadout"> & {
  /**
   * @generated from field: bytes id = 1;
   */
  id: Uint8Array;

  /**
   * @generated from field: string name = 2;
   */
  name: string;

  /**
   * @generated from field: string notes = 3;
   */
  notes: string;

  /**
   * @generated from field: stately.generated.DestinyClass classType = 4;
   */
  classType: DestinyClass;

  /**
   * @generated from field: repeated stately.generated.LoadoutItem equipped = 5;
   */
  equipped: LoadoutItem[];

  /**
   * @generated from field: repeated stately.generated.LoadoutItem unequipped = 6;
   */
  unequipped: LoadoutItem[];

  /**
   * @generated from field: stately.generated.LoadoutParameters parameters = 7;
   */
  parameters?: LoadoutParameters;

  /**
   * @generated from field: sint64 createdAt = 8;
   */
  createdAt: bigint;

  /**
   * @generated from field: sint64 lastUpdatedAt = 9;
   */
  lastUpdatedAt: bigint;

  /**
   * @generated from field: uint32 destinyVersion = 10;
   */
  destinyVersion: number;

  /**
   * @generated from field: uint64 profileId = 11;
   */
  profileId: bigint;
};

/**
 * Describes the message stately.generated.Loadout.
 * Use `create(LoadoutSchema)` to create a new message.
 */
export declare const LoadoutSchema: GenMessage<Loadout>;

/**
 * @generated from message stately.generated.LoadoutItem
 */
export declare type LoadoutItem = Message<"stately.generated.LoadoutItem"> & {
  /**
   * @generated from field: uint64 id = 1;
   */
  id: bigint;

  /**
   * @generated from field: uint32 hash = 2;
   */
  hash: number;

  /**
   * @generated from field: uint32 amount = 3;
   */
  amount: number;

  /**
   * @generated from field: repeated stately.generated.SocketOverride socketOverrides = 4;
   */
  socketOverrides: SocketOverride[];

  /**
   * @generated from field: sint64 craftedDate = 5;
   */
  craftedDate: bigint;
};

/**
 * Describes the message stately.generated.LoadoutItem.
 * Use `create(LoadoutItemSchema)` to create a new message.
 */
export declare const LoadoutItemSchema: GenMessage<LoadoutItem>;

/**
 * @generated from message stately.generated.LoadoutParameters
 */
export declare type LoadoutParameters = Message<"stately.generated.LoadoutParameters"> & {
  /**
   * @generated from field: repeated stately.generated.StatConstraint statConstraints = 1;
   */
  statConstraints: StatConstraint[];

  /**
   * @generated from field: repeated uint32 mods = 2;
   */
  mods: number[];

  /**
   * @generated from field: bool clearMods = 3;
   */
  clearMods: boolean;

  /**
   * @generated from field: bool clearWeapons = 4;
   */
  clearWeapons: boolean;

  /**
   * @generated from field: bool clearArmor = 5;
   */
  clearArmor: boolean;

  /**
   * @generated from field: repeated stately.generated.ModsByBucketEntry modsByBucket = 6;
   */
  modsByBucket: ModsByBucketEntry[];

  /**
   * @generated from field: stately.generated.ArtifactUnlocks artifactUnlocks = 7;
   */
  artifactUnlocks?: ArtifactUnlocks;

  /**
   * @generated from field: bool autoStatMods = 8;
   */
  autoStatMods: boolean;

  /**
   * @generated from field: string query = 9;
   */
  query: string;

  /**
   * @generated from field: stately.generated.AssumeArmorMasterwork assumeArmorMasterwork = 10;
   */
  assumeArmorMasterwork: AssumeArmorMasterwork;

  /**
   * @generated from field: int64 exoticArmorHash = 11;
   */
  exoticArmorHash: bigint;

  /**
   * @generated from field: stately.generated.InGameLoadoutIdentifiers inGameIdentifiers = 12;
   */
  inGameIdentifiers?: InGameLoadoutIdentifiers;

  /**
   * @generated from field: bool includeRuntimeStatBenefits = 13;
   */
  includeRuntimeStatBenefits: boolean;
};

/**
 * Describes the message stately.generated.LoadoutParameters.
 * Use `create(LoadoutParametersSchema)` to create a new message.
 */
export declare const LoadoutParametersSchema: GenMessage<LoadoutParameters>;

/**
 * @generated from message stately.generated.LoadoutShare
 */
export declare type LoadoutShare = Message<"stately.generated.LoadoutShare"> & {
  /**
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * @generated from field: string name = 2;
   */
  name: string;

  /**
   * @generated from field: string notes = 3;
   */
  notes: string;

  /**
   * @generated from field: stately.generated.DestinyClass classType = 4;
   */
  classType: DestinyClass;

  /**
   * @generated from field: repeated stately.generated.LoadoutItem equipped = 5;
   */
  equipped: LoadoutItem[];

  /**
   * @generated from field: repeated stately.generated.LoadoutItem unequipped = 6;
   */
  unequipped: LoadoutItem[];

  /**
   * @generated from field: stately.generated.LoadoutParameters parameters = 7;
   */
  parameters?: LoadoutParameters;

  /**
   * @generated from field: sint64 createdAt = 8;
   */
  createdAt: bigint;

  /**
   * @generated from field: sint64 lastUpdatedAt = 9;
   */
  lastUpdatedAt: bigint;

  /**
   * @generated from field: uint32 destinyVersion = 10;
   */
  destinyVersion: number;

  /**
   * @generated from field: uint64 profileId = 11;
   */
  profileId: bigint;

  /**
   * @generated from field: uint32 viewCount = 15;
   */
  viewCount: number;
};

/**
 * Describes the message stately.generated.LoadoutShare.
 * Use `create(LoadoutShareSchema)` to create a new message.
 */
export declare const LoadoutShareSchema: GenMessage<LoadoutShare>;

/**
 * @generated from message stately.generated.ModsByBucketEntry
 */
export declare type ModsByBucketEntry = Message<"stately.generated.ModsByBucketEntry"> & {
  /**
   * @generated from field: uint32 bucketHash = 1;
   */
  bucketHash: number;

  /**
   * @generated from field: repeated uint32 modHashes = 2;
   */
  modHashes: number[];
};

/**
 * Describes the message stately.generated.ModsByBucketEntry.
 * Use `create(ModsByBucketEntrySchema)` to create a new message.
 */
export declare const ModsByBucketEntrySchema: GenMessage<ModsByBucketEntry>;

/**
 * @generated from message stately.generated.Search
 */
export declare type Search = Message<"stately.generated.Search"> & {
  /**
   * @generated from field: string query = 1;
   */
  query: string;

  /**
   * @generated from field: uint32 usageCount = 2;
   */
  usageCount: number;

  /**
   * @generated from field: bool saved = 3;
   */
  saved: boolean;

  /**
   * @generated from field: sint64 lastUsage = 4;
   */
  lastUsage: bigint;

  /**
   * @generated from field: stately.generated.SearchType type = 5;
   */
  type: SearchType;

  /**
   * @generated from field: bytes qhash = 6;
   */
  qhash: Uint8Array;

  /**
   * @generated from field: uint64 profileId = 7;
   */
  profileId: bigint;

  /**
   * @generated from field: uint32 destinyVersion = 8;
   */
  destinyVersion: number;
};

/**
 * Describes the message stately.generated.Search.
 * Use `create(SearchSchema)` to create a new message.
 */
export declare const SearchSchema: GenMessage<Search>;

/**
 * @generated from message stately.generated.Settings
 */
export declare type Settings = Message<"stately.generated.Settings"> & {
  /**
   * @generated from field: uint64 memberId = 1;
   */
  memberId: bigint;

  /**
   * @generated from field: bool itemQuality = 2;
   */
  itemQuality: boolean;

  /**
   * @generated from field: bool showNewItems = 3;
   */
  showNewItems: boolean;

  /**
   * @generated from field: stately.generated.CharacterOrder characterOrder = 4;
   */
  characterOrder: CharacterOrder;

  /**
   * @generated from field: repeated string itemSortOrderCustom = 5;
   */
  itemSortOrderCustom: string[];

  /**
   * @generated from field: repeated string itemSortReversals = 6;
   */
  itemSortReversals: string[];

  /**
   * @generated from field: uint32 charCol = 7;
   */
  charCol: number;

  /**
   * @generated from field: uint32 charColMobile = 8;
   */
  charColMobile: number;

  /**
   * @generated from field: uint32 itemSize = 9;
   */
  itemSize: number;

  /**
   * @generated from field: repeated stately.generated.CollapsedSection collapsedSections = 10;
   */
  collapsedSections: CollapsedSection[];

  /**
   * @generated from field: bool completedRecordsHidden = 11;
   */
  completedRecordsHidden: boolean;

  /**
   * @generated from field: bool redactedRecordsRevealed = 12;
   */
  redactedRecordsRevealed: boolean;

  /**
   * @generated from field: bool farmingMakeRoomForItems = 13;
   */
  farmingMakeRoomForItems: boolean;

  /**
   * @generated from field: uint32 inventoryClearSpaces = 14;
   */
  inventoryClearSpaces: number;

  /**
   * @generated from field: bool hideCompletedRecords = 15;
   */
  hideCompletedRecords: boolean;

  /**
   * @generated from field: repeated string customCharacterSort = 16;
   */
  customCharacterSort: string[];

  /**
   * @generated from field: stately.generated.InfuseDirection infusionDirection = 17;
   */
  infusionDirection: InfuseDirection;

  /**
   * @generated from field: string language = 18;
   */
  language: string;

  /**
   * @generated from field: repeated string wishListSources = 19;
   */
  wishListSources: string[];

  /**
   * @generated from field: stately.generated.LoadoutParameters loParameters = 20;
   */
  loParameters?: LoadoutParameters;

  /**
   * @generated from field: repeated stately.generated.StatConstraintsEntry loStatConstraintsByClass = 21;
   */
  loStatConstraintsByClass: StatConstraintsEntry[];

  /**
   * @generated from field: repeated stately.generated.CustomStatsEntry customTotalStatsByClass = 22;
   */
  customTotalStatsByClass: CustomStatsEntry[];

  /**
   * @generated from field: repeated string organizerColumnsWeapons = 23;
   */
  organizerColumnsWeapons: string[];

  /**
   * @generated from field: repeated string organizerColumnsArmor = 24;
   */
  organizerColumnsArmor: string[];

  /**
   * @generated from field: repeated string organizerColumnsGhost = 25;
   */
  organizerColumnsGhost: string[];

  /**
   * @generated from field: bool compareBaseStats = 26;
   */
  compareBaseStats: boolean;

  /**
   * @generated from field: bool sidecarCollapsed = 27;
   */
  sidecarCollapsed: boolean;

  /**
   * @generated from field: bool singleCharacter = 28;
   */
  singleCharacter: boolean;

  /**
   * @generated from field: bool badgePostmaster = 29;
   */
  badgePostmaster: boolean;

  /**
   * @generated from field: bool perkList = 30;
   */
  perkList: boolean;

  /**
   * @generated from field: stately.generated.LoadoutSort loadoutSort = 31;
   */
  loadoutSort: LoadoutSort;

  /**
   * @generated from field: bool itemFeedHideTagged = 32;
   */
  itemFeedHideTagged: boolean;

  /**
   * @generated from field: bool itemFeedExpanded = 33;
   */
  itemFeedExpanded: boolean;

  /**
   * @generated from field: bool hidePullFromPostmaster = 34;
   */
  hidePullFromPostmaster: boolean;

  /**
   * @generated from field: stately.generated.DescriptionOptions descriptionsToDisplay = 35;
   */
  descriptionsToDisplay: DescriptionOptions;

  /**
   * @generated from field: bool compareWeaponMasterwork = 36;
   */
  compareWeaponMasterwork: boolean;

  /**
   * @generated from field: uint64 itemFeedWatermark = 37;
   */
  itemFeedWatermark: bigint;

  /**
   * @generated from field: repeated stately.generated.CustomStatDef customStats = 38;
   */
  customStats: CustomStatDef[];

  /**
   * @generated from field: bool autoLockTagged = 39;
   */
  autoLockTagged: boolean;

  /**
   * @generated from field: string theme = 40;
   */
  theme: string;

  /**
   * @generated from field: bool sortRecordProgression = 41;
   */
  sortRecordProgression: boolean;

  /**
   * @generated from field: bool vendorsHideSilverItems = 42;
   */
  vendorsHideSilverItems: boolean;

  /**
   * @generated from field: string vaultWeaponGrouping = 43;
   */
  vaultWeaponGrouping: string;

  /**
   * @generated from field: stately.generated.VaultWeaponGroupingStyle vaultWeaponGroupingStyle = 44;
   */
  vaultWeaponGroupingStyle: VaultWeaponGroupingStyle;

  /**
   * @generated from field: stately.generated.ItemPopupTab itemPopupTab = 45;
   */
  itemPopupTab: ItemPopupTab;
};

/**
 * Describes the message stately.generated.Settings.
 * Use `create(SettingsSchema)` to create a new message.
 */
export declare const SettingsSchema: GenMessage<Settings>;

/**
 * @generated from message stately.generated.SocketOverride
 */
export declare type SocketOverride = Message<"stately.generated.SocketOverride"> & {
  /**
   * @generated from field: uint32 socketIndex = 1;
   */
  socketIndex: number;

  /**
   * @generated from field: uint32 itemHash = 2;
   */
  itemHash: number;
};

/**
 * Describes the message stately.generated.SocketOverride.
 * Use `create(SocketOverrideSchema)` to create a new message.
 */
export declare const SocketOverrideSchema: GenMessage<SocketOverride>;

/**
 * @generated from message stately.generated.StatConstraint
 */
export declare type StatConstraint = Message<"stately.generated.StatConstraint"> & {
  /**
   * @generated from field: uint32 statHash = 1;
   */
  statHash: number;

  /**
   * @generated from field: uint32 minTier = 2;
   */
  minTier: number;

  /**
   * @generated from field: uint32 maxTier = 3;
   */
  maxTier: number;
};

/**
 * Describes the message stately.generated.StatConstraint.
 * Use `create(StatConstraintSchema)` to create a new message.
 */
export declare const StatConstraintSchema: GenMessage<StatConstraint>;

/**
 * @generated from message stately.generated.StatConstraintsEntry
 */
export declare type StatConstraintsEntry = Message<"stately.generated.StatConstraintsEntry"> & {
  /**
   * @generated from field: stately.generated.DestinyClass classType = 1;
   */
  classType: DestinyClass;

  /**
   * @generated from field: repeated stately.generated.StatConstraint constraints = 2;
   */
  constraints: StatConstraint[];
};

/**
 * Describes the message stately.generated.StatConstraintsEntry.
 * Use `create(StatConstraintsEntrySchema)` to create a new message.
 */
export declare const StatConstraintsEntrySchema: GenMessage<StatConstraintsEntry>;

/**
 * @generated from message stately.generated.Triumph
 */
export declare type Triumph = Message<"stately.generated.Triumph"> & {
  /**
   * @generated from field: uint32 recordHash = 1;
   */
  recordHash: number;

  /**
   * @generated from field: uint64 profileId = 2;
   */
  profileId: bigint;

  /**
   * @generated from field: uint32 destinyVersion = 7;
   */
  destinyVersion: number;
};

/**
 * Describes the message stately.generated.Triumph.
 * Use `create(TriumphSchema)` to create a new message.
 */
export declare const TriumphSchema: GenMessage<Triumph>;

/**
 * @generated from enum stately.generated.AssumeArmorMasterwork
 */
export enum AssumeArmorMasterwork {
  /**
   * @generated from enum value: AssumeArmorMasterwork_None = 0;
   */
  AssumeArmorMasterwork_None = 0,

  /**
   * @generated from enum value: AssumeArmorMasterwork_Legendary = 1;
   */
  AssumeArmorMasterwork_Legendary = 1,

  /**
   * @generated from enum value: AssumeArmorMasterwork_All = 2;
   */
  AssumeArmorMasterwork_All = 2,

  /**
   * @generated from enum value: AssumeArmorMasterwork_ArtificeExotic = 3;
   */
  AssumeArmorMasterwork_ArtificeExotic = 3,
}

/**
 * Describes the enum stately.generated.AssumeArmorMasterwork.
 */
export declare const AssumeArmorMasterworkSchema: GenEnum<AssumeArmorMasterwork>;

/**
 * @generated from enum stately.generated.CharacterOrder
 */
export enum CharacterOrder {
  /**
   * @generated from enum value: CharacterOrder_UNSPECIFIED = 0;
   */
  CharacterOrder_UNSPECIFIED = 0,

  /**
   * @generated from enum value: CharacterOrder_mostRecent = 1;
   */
  CharacterOrder_mostRecent = 1,

  /**
   * @generated from enum value: CharacterOrder_mostRecentReverse = 2;
   */
  CharacterOrder_mostRecentReverse = 2,

  /**
   * @generated from enum value: CharacterOrder_fixed = 3;
   */
  CharacterOrder_fixed = 3,

  /**
   * @generated from enum value: CharacterOrder_custom = 4;
   */
  CharacterOrder_custom = 4,
}

/**
 * Describes the enum stately.generated.CharacterOrder.
 */
export declare const CharacterOrderSchema: GenEnum<CharacterOrder>;

/**
 * @generated from enum stately.generated.DescriptionOptions
 */
export enum DescriptionOptions {
  /**
   * @generated from enum value: DescriptionOptions_UNSPECIFIED = 0;
   */
  DescriptionOptions_UNSPECIFIED = 0,

  /**
   * @generated from enum value: DescriptionOptions_bungie = 1;
   */
  DescriptionOptions_bungie = 1,

  /**
   * @generated from enum value: DescriptionOptions_community = 2;
   */
  DescriptionOptions_community = 2,

  /**
   * @generated from enum value: DescriptionOptions_both = 3;
   */
  DescriptionOptions_both = 3,
}

/**
 * Describes the enum stately.generated.DescriptionOptions.
 */
export declare const DescriptionOptionsSchema: GenEnum<DescriptionOptions>;

/**
 * @generated from enum stately.generated.DestinyClass
 */
export enum DestinyClass {
  /**
   * @generated from enum value: DestinyClass_Titan = 0;
   */
  DestinyClass_Titan = 0,

  /**
   * @generated from enum value: DestinyClass_Hunter = 1;
   */
  DestinyClass_Hunter = 1,

  /**
   * @generated from enum value: DestinyClass_Warlock = 2;
   */
  DestinyClass_Warlock = 2,

  /**
   * @generated from enum value: DestinyClass_Unknown = 3;
   */
  DestinyClass_Unknown = 3,
}

/**
 * Describes the enum stately.generated.DestinyClass.
 */
export declare const DestinyClassSchema: GenEnum<DestinyClass>;

/**
 * @generated from enum stately.generated.InfuseDirection
 */
export enum InfuseDirection {
  /**
   * @generated from enum value: InfuseDirection_UNSPECIFIED = 0;
   */
  InfuseDirection_UNSPECIFIED = 0,

  /**
   * @generated from enum value: InfuseDirection_Infuse = 1;
   */
  InfuseDirection_Infuse = 1,

  /**
   * @generated from enum value: InfuseDirection_Fuel = 2;
   */
  InfuseDirection_Fuel = 2,
}

/**
 * Describes the enum stately.generated.InfuseDirection.
 */
export declare const InfuseDirectionSchema: GenEnum<InfuseDirection>;

/**
 * @generated from enum stately.generated.ItemPopupTab
 */
export enum ItemPopupTab {
  /**
   * @generated from enum value: ItemPopupTab_Overview = 0;
   */
  ItemPopupTab_Overview = 0,

  /**
   * @generated from enum value: ItemPopupTab_Triage = 1;
   */
  ItemPopupTab_Triage = 1,
}

/**
 * Describes the enum stately.generated.ItemPopupTab.
 */
export declare const ItemPopupTabSchema: GenEnum<ItemPopupTab>;

/**
 * @generated from enum stately.generated.LoadoutSort
 */
export enum LoadoutSort {
  /**
   * @generated from enum value: LoadoutSort_ByEditTime = 0;
   */
  LoadoutSort_ByEditTime = 0,

  /**
   * @generated from enum value: LoadoutSort_ByName = 1;
   */
  LoadoutSort_ByName = 1,
}

/**
 * Describes the enum stately.generated.LoadoutSort.
 */
export declare const LoadoutSortSchema: GenEnum<LoadoutSort>;

/**
 * @generated from enum stately.generated.SearchType
 */
export enum SearchType {
  /**
   * @generated from enum value: SearchType_Item = 0;
   */
  SearchType_Item = 0,

  /**
   * @generated from enum value: SearchType_Loadout = 1;
   */
  SearchType_Loadout = 1,
}

/**
 * Describes the enum stately.generated.SearchType.
 */
export declare const SearchTypeSchema: GenEnum<SearchType>;

/**
 * @generated from enum stately.generated.TagValue
 */
export enum TagValue {
  /**
   * @generated from enum value: TagValue_UNSPECIFIED = 0;
   */
  TagValue_UNSPECIFIED = 0,

  /**
   * @generated from enum value: TagValue_favorite = 1;
   */
  TagValue_favorite = 1,

  /**
   * @generated from enum value: TagValue_keep = 2;
   */
  TagValue_keep = 2,

  /**
   * @generated from enum value: TagValue_infuse = 3;
   */
  TagValue_infuse = 3,

  /**
   * @generated from enum value: TagValue_junk = 4;
   */
  TagValue_junk = 4,

  /**
   * @generated from enum value: TagValue_archive = 5;
   */
  TagValue_archive = 5,
}

/**
 * Describes the enum stately.generated.TagValue.
 */
export declare const TagValueSchema: GenEnum<TagValue>;

/**
 * @generated from enum stately.generated.VaultWeaponGroupingStyle
 */
export enum VaultWeaponGroupingStyle {
  /**
   * @generated from enum value: VaultWeaponGroupingStyle_Lines = 0;
   */
  VaultWeaponGroupingStyle_Lines = 0,

  /**
   * @generated from enum value: VaultWeaponGroupingStyle_Inline = 1;
   */
  VaultWeaponGroupingStyle_Inline = 1,
}

/**
 * Describes the enum stately.generated.VaultWeaponGroupingStyle.
 */
export declare const VaultWeaponGroupingStyleSchema: GenEnum<VaultWeaponGroupingStyle>;


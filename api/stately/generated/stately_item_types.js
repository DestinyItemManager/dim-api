// @generated by Stately. DO NOT EDIT.
/* eslint-disable */

import { createClient as createGenericClient } from '@stately-cloud/client';
import {
  ApiAppSchema,
  ArtifactUnlocksSchema,
  CollapsedSectionSchema,
  CustomStatDefSchema,
  CustomStatsEntrySchema,
  CustomStatWeightsEntrySchema,
  GlobalSettingsSchema,
  InGameLoadoutIdentifiersSchema,
  ItemAnnotationSchema,
  ItemHashTagSchema,
  LoadoutItemSchema,
  LoadoutParametersSchema,
  LoadoutSchema,
  LoadoutShareSchema,
  ModsByBucketEntrySchema,
  SearchSchema,
  SettingsSchema,
  SocketOverrideSchema,
  StatConstraintSchema,
  StatConstraintsEntrySchema,
  TriumphSchema,
} from './stately_pb.js';

export const typeToSchema = {
  // itemTypes
  ApiApp: ApiAppSchema,
  GlobalSettings: GlobalSettingsSchema,
  ItemAnnotation: ItemAnnotationSchema,
  ItemHashTag: ItemHashTagSchema,
  Loadout: LoadoutSchema,
  LoadoutShare: LoadoutShareSchema,
  Search: SearchSchema,
  Settings: SettingsSchema,
  Triumph: TriumphSchema,

  // objectTypes
  ArtifactUnlocks: ArtifactUnlocksSchema,
  CollapsedSection: CollapsedSectionSchema,
  CustomStatDef: CustomStatDefSchema,
  CustomStatWeightsEntry: CustomStatWeightsEntrySchema,
  CustomStatsEntry: CustomStatsEntrySchema,
  InGameLoadoutIdentifiers: InGameLoadoutIdentifiersSchema,
  LoadoutItem: LoadoutItemSchema,
  LoadoutParameters: LoadoutParametersSchema,
  ModsByBucketEntry: ModsByBucketEntrySchema,
  SocketOverride: SocketOverrideSchema,
  StatConstraint: StatConstraintSchema,
  StatConstraintsEntry: StatConstraintsEntrySchema,
};

/** The version of the schema that this client was generated for. */
const SCHEMA_VERSION_ID = 3;

export function createClient(storeId, opts) {
  return createGenericClient(storeId, typeToSchema, SCHEMA_VERSION_ID, opts);
}

if (createGenericClient.length < 3) {
  throw new Error(
    'Your version of @stately-cloud/client is too old. Please update to the latest version.',
  );
}

// @generated by protoc-gen-es v2.0.0 with parameter "target=js+dts,import_extension=.js"
// @generated from file index.proto (package stately.generated, syntax proto3)
/* eslint-disable */

import { enumDesc, fileDesc, messageDesc, tsEnum } from "@bufbuild/protobuf/codegenv1";

/**
 * Describes the file index.proto.
 */
export const file_index = /*@__PURE__*/
  fileDesc("CgtpbmRleC5wcm90bxIRc3RhdGVseS5nZW5lcmF0ZWQiYAoGQXBpQXBwEgoKAmlkGAEgASgJEhQKDGJ1bmdpZUFwaUtleRgCIAEoCRIRCglkaW1BcGlLZXkYAyABKAkSDgoGb3JpZ2luGAQgASgJEhEKCXBhcnRpdGlvbhgFIAEoBCJDCg9BcnRpZmFjdFVubG9ja3MSGgoSdW5sb2NrZWRJdGVtSGFzaGVzGAEgAygEEhQKDHNlYXNvbk51bWJlchgCIAEoBCIyChBDb2xsYXBzZWRTZWN0aW9uEgsKA2tleRgBIAEoCRIRCgljb2xsYXBzZWQYAiABKAgisAEKDUN1c3RvbVN0YXREZWYSEAoIc3RhdEhhc2gYASABKAQSDQoFbGFiZWwYAiABKAkSEgoKc2hvcnRMYWJlbBgDIAEoCRIuCgVjbGFzcxgEIAEoDjIfLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc3RpbnlDbGFzcxI6Cgd3ZWlnaHRzGAUgAygLMikuc3RhdGVseS5nZW5lcmF0ZWQuQ3VzdG9tU3RhdFdlaWdodHNFbnRyeSI6ChZDdXN0b21TdGF0V2VpZ2h0c0VudHJ5EhAKCHN0YXRIYXNoGAEgASgEEg4KBndlaWdodBgCIAEoASJbChBDdXN0b21TdGF0c0VudHJ5EjIKCWNsYXNzVHlwZRgBIAEoDjIfLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc3RpbnlDbGFzcxITCgtjdXN0b21TdGF0cxgCIAMoBCKZAgoOR2xvYmFsU2V0dGluZ3MSDQoFc3RhZ2UYASABKAkSFQoNZGltQXBpRW5hYmxlZBgCIAEoCBIsCiRkZXN0aW55UHJvZmlsZU1pbmltdW1SZWZyZXNoSW50ZXJ2YWwYAyABKBISJQodZGVzdGlueVByb2ZpbGVSZWZyZXNoSW50ZXJ2YWwYBCABKBISEwoLYXV0b1JlZnJlc2gYBSABKAgSHwoXcmVmcmVzaFByb2ZpbGVPblZpc2libGUYBiABKAgSKAogZGltUHJvZmlsZU1pbmltdW1SZWZyZXNoSW50ZXJ2YWwYByABKBISFwoPc2hvd0lzc3VlQmFubmVyGAggASgIEhMKC2xhc3RVcGRhdGVkGAkgASgSIlEKGEluR2FtZUxvYWRvdXRJZGVudGlmaWVycxIRCgljb2xvckhhc2gYASABKAQSEAoIaWNvbkhhc2gYAiABKAQSEAoIbmFtZUhhc2gYAyABKAQiowEKDkl0ZW1Bbm5vdGF0aW9uEgwKBGhhc2gYASABKAQSKAoDdGFnGAIgASgOMhsuc3RhdGVseS5nZW5lcmF0ZWQuVGFnVmFsdWUSDQoFbm90ZXMYAyABKAkSEQoJcHJvZmlsZUlkGAYgASgEEhYKDmRlc3RpbnlWZXJzaW9uGAcgASgEEgoKAmlkGAQgASgEEhMKC2NyYWZ0ZWREYXRlGAUgASgSIn8KC0l0ZW1IYXNoVGFnEgwKBGhhc2gYASABKAQSKAoDdGFnGAIgASgOMhsuc3RhdGVseS5nZW5lcmF0ZWQuVGFnVmFsdWUSDQoFbm90ZXMYAyABKAkSEQoJcHJvZmlsZUlkGAYgASgEEhYKDmRlc3RpbnlWZXJzaW9uGAcgASgEItsCCgdMb2Fkb3V0EgoKAmlkGAEgASgMEgwKBG5hbWUYAiABKAkSDQoFbm90ZXMYAyABKAkSMgoJY2xhc3NUeXBlGAQgASgOMh8uc3RhdGVseS5nZW5lcmF0ZWQuRGVzdGlueUNsYXNzEjAKCGVxdWlwcGVkGAUgAygLMh4uc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dEl0ZW0SMgoKdW5lcXVpcHBlZBgGIAMoCzIeLnN0YXRlbHkuZ2VuZXJhdGVkLkxvYWRvdXRJdGVtEjgKCnBhcmFtZXRlcnMYByABKAsyJC5zdGF0ZWx5LmdlbmVyYXRlZC5Mb2Fkb3V0UGFyYW1ldGVycxIRCgljcmVhdGVkQXQYCCABKBISFQoNbGFzdFVwZGF0ZWRBdBgJIAEoEhIWCg5kZXN0aW55VmVyc2lvbhgKIAEoBBIRCglwcm9maWxlSWQYCyABKAQiiAEKC0xvYWRvdXRJdGVtEgoKAmlkGAEgASgEEgwKBGhhc2gYAiABKAQSDgoGYW1vdW50GAMgASgEEjoKD3NvY2tldE92ZXJyaWRlcxgEIAMoCzIhLnN0YXRlbHkuZ2VuZXJhdGVkLlNvY2tldE92ZXJyaWRlEhMKC2NyYWZ0ZWREYXRlGAUgASgSIoYEChFMb2Fkb3V0UGFyYW1ldGVycxI6Cg9zdGF0Q29uc3RyYWludHMYASADKAsyIS5zdGF0ZWx5LmdlbmVyYXRlZC5TdGF0Q29uc3RyYWludBIMCgRtb2RzGAIgAygEEhEKCWNsZWFyTW9kcxgDIAEoCBIUCgxjbGVhcldlYXBvbnMYBCABKAgSEgoKY2xlYXJBcm1vchgFIAEoCBI6Cgxtb2RzQnlCdWNrZXQYBiABKAsyJC5zdGF0ZWx5LmdlbmVyYXRlZC5Nb2RzQnlCdWNrZXRFbnRyeRI7Cg9hcnRpZmFjdFVubG9ja3MYByABKAsyIi5zdGF0ZWx5LmdlbmVyYXRlZC5BcnRpZmFjdFVubG9ja3MSFAoMYXV0b1N0YXRNb2RzGAggASgIEg0KBXF1ZXJ5GAkgASgJEkcKFWFzc3VtZUFybW9yTWFzdGVyd29yaxgKIAEoDjIoLnN0YXRlbHkuZ2VuZXJhdGVkLkFzc3VtZUFybW9yTWFzdGVyd29yaxIXCg9leG90aWNBcm1vckhhc2gYCyABKAQSRgoRaW5HYW1lSWRlbnRpZmllcnMYDCABKAsyKy5zdGF0ZWx5LmdlbmVyYXRlZC5JbkdhbWVMb2Fkb3V0SWRlbnRpZmllcnMSIgoaaW5jbHVkZVJ1bnRpbWVTdGF0QmVuZWZpdHMYDSABKAgi4AIKDExvYWRvdXRTaGFyZRIKCgJpZBgBIAEoCRIMCgRuYW1lGAIgASgJEg0KBW5vdGVzGAMgASgJEjIKCWNsYXNzVHlwZRgEIAEoDjIfLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc3RpbnlDbGFzcxIwCghlcXVpcHBlZBgFIAMoCzIeLnN0YXRlbHkuZ2VuZXJhdGVkLkxvYWRvdXRJdGVtEjIKCnVuZXF1aXBwZWQYBiADKAsyHi5zdGF0ZWx5LmdlbmVyYXRlZC5Mb2Fkb3V0SXRlbRI4CgpwYXJhbWV0ZXJzGAcgASgLMiQuc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dFBhcmFtZXRlcnMSEQoJY3JlYXRlZEF0GAggASgSEhUKDWxhc3RVcGRhdGVkQXQYCSABKBISFgoOZGVzdGlueVZlcnNpb24YCiABKAQSEQoJcHJvZmlsZUlkGAsgASgEIjoKEU1vZHNCeUJ1Y2tldEVudHJ5EhIKCmJ1Y2tldEhhc2gYASABKAQSEQoJbW9kSGFzaGVzGAIgAygEIrQBCgZTZWFyY2gSDQoFcXVlcnkYASABKAkSEgoKdXNhZ2VDb3VudBgCIAEoBBINCgVzYXZlZBgDIAEoCBIRCglsYXN0VXNhZ2UYBCABKBISKwoEdHlwZRgFIAEoDjIdLnN0YXRlbHkuZ2VuZXJhdGVkLlNlYXJjaFR5cGUSDQoFcWhhc2gYBiABKAwSEQoJcHJvZmlsZUlkGAcgASgEEhYKDmRlc3RpbnlWZXJzaW9uGAggASgEIsoMCghTZXR0aW5ncxIQCghtZW1iZXJJZBgBIAEoCRITCgtpdGVtUXVhbGl0eRgCIAEoCBIUCgxzaG93TmV3SXRlbXMYAyABKAgSOQoOY2hhcmFjdGVyT3JkZXIYBCABKA4yIS5zdGF0ZWx5LmdlbmVyYXRlZC5DaGFyYWN0ZXJPcmRlchIbChNpdGVtU29ydE9yZGVyQ3VzdG9tGAUgAygJEhkKEWl0ZW1Tb3J0UmV2ZXJzYWxzGAYgAygJEg8KB2NoYXJDb2wYByABKAQSFQoNY2hhckNvbE1vYmlsZRgIIAEoBBIQCghpdGVtU2l6ZRgJIAEoBBI+ChFjb2xsYXBzZWRTZWN0aW9ucxgKIAMoCzIjLnN0YXRlbHkuZ2VuZXJhdGVkLkNvbGxhcHNlZFNlY3Rpb24SHgoWY29tcGxldGVkUmVjb3Jkc0hpZGRlbhgLIAEoCBIfChdyZWRhY3RlZFJlY29yZHNSZXZlYWxlZBgMIAEoCBIfChdmYXJtaW5nTWFrZVJvb21Gb3JJdGVtcxgNIAEoCBIcChRpbnZlbnRvcnlDbGVhclNwYWNlcxgOIAEoBBIcChRoaWRlQ29tcGxldGVkUmVjb3JkcxgPIAEoCBIbChNjdXN0b21DaGFyYWN0ZXJTb3J0GBAgAygJEj0KEWluZnVzaW9uRGlyZWN0aW9uGBEgASgOMiIuc3RhdGVseS5nZW5lcmF0ZWQuSW5mdXNlRGlyZWN0aW9uEhAKCGxhbmd1YWdlGBIgASgJEhcKD3dpc2hMaXN0U291cmNlcxgTIAMoCRI6Cgxsb1BhcmFtZXRlcnMYFCABKAsyJC5zdGF0ZWx5LmdlbmVyYXRlZC5Mb2Fkb3V0UGFyYW1ldGVycxJJChhsb1N0YXRDb25zdHJhaW50c0J5Q2xhc3MYFSADKAsyJy5zdGF0ZWx5LmdlbmVyYXRlZC5TdGF0Q29uc3RyYWludHNFbnRyeRJEChdjdXN0b21Ub3RhbFN0YXRzQnlDbGFzcxgWIAMoCzIjLnN0YXRlbHkuZ2VuZXJhdGVkLkN1c3RvbVN0YXRzRW50cnkSHwoXb3JnYW5pemVyQ29sdW1uc1dlYXBvbnMYFyADKAkSHQoVb3JnYW5pemVyQ29sdW1uc0FybW9yGBggAygJEh0KFW9yZ2FuaXplckNvbHVtbnNHaG9zdBgZIAMoCRIYChBjb21wYXJlQmFzZVN0YXRzGBogASgIEhgKEHNpZGVjYXJDb2xsYXBzZWQYGyABKAgSFwoPc2luZ2xlQ2hhcmFjdGVyGBwgASgIEhcKD2JhZGdlUG9zdG1hc3RlchgdIAEoCBIQCghwZXJrTGlzdBgeIAEoCBIzCgtsb2Fkb3V0U29ydBgfIAEoDjIeLnN0YXRlbHkuZ2VuZXJhdGVkLkxvYWRvdXRTb3J0EhoKEml0ZW1GZWVkSGlkZVRhZ2dlZBggIAEoCBIYChBpdGVtRmVlZEV4cGFuZGVkGCEgASgIEh4KFmhpZGVQdWxsRnJvbVBvc3RtYXN0ZXIYIiABKAgSRAoVZGVzY3JpcHRpb25zVG9EaXNwbGF5GCMgASgOMiUuc3RhdGVseS5nZW5lcmF0ZWQuRGVzY3JpcHRpb25PcHRpb25zEh8KF2NvbXBhcmVXZWFwb25NYXN0ZXJ3b3JrGCQgASgIEhkKEWl0ZW1GZWVkV2F0ZXJtYXJrGCUgASgEEjUKC2N1c3RvbVN0YXRzGCYgAygLMiAuc3RhdGVseS5nZW5lcmF0ZWQuQ3VzdG9tU3RhdERlZhIWCg5hdXRvTG9ja1RhZ2dlZBgnIAEoCBINCgV0aGVtZRgoIAEoCRIdChVzb3J0UmVjb3JkUHJvZ3Jlc3Npb24YKSABKAgSHgoWdmVuZG9yc0hpZGVTaWx2ZXJJdGVtcxgqIAEoCBIbChN2YXVsdFdlYXBvbkdyb3VwaW5nGCsgASgJEk0KGHZhdWx0V2VhcG9uR3JvdXBpbmdTdHlsZRgsIAEoDjIrLnN0YXRlbHkuZ2VuZXJhdGVkLlZhdWx0V2VhcG9uR3JvdXBpbmdTdHlsZRI1CgxpdGVtUG9wdXBUYWIYLSABKA4yHy5zdGF0ZWx5LmdlbmVyYXRlZC5JdGVtUG9wdXBUYWIiNwoOU29ja2V0T3ZlcnJpZGUSEwoLc29ja2V0SW5kZXgYASABKAQSEAoIaXRlbUhhc2gYAiABKAQiRAoOU3RhdENvbnN0cmFpbnQSEAoIc3RhdEhhc2gYASABKAQSDwoHbWluVGllchgCIAEoBBIPCgdtYXhUaWVyGAMgASgEIoIBChRTdGF0Q29uc3RyYWludHNFbnRyeRIyCgljbGFzc1R5cGUYASABKA4yHy5zdGF0ZWx5LmdlbmVyYXRlZC5EZXN0aW55Q2xhc3MSNgoLY29uc3RyYWludHMYAiADKAsyIS5zdGF0ZWx5LmdlbmVyYXRlZC5TdGF0Q29uc3RyYWludCJICgdUcml1bXBoEhIKCnJlY29yZEhhc2gYASABKAQSEQoJcHJvZmlsZUlkGAIgASgEEhYKDmRlc3RpbnlWZXJzaW9uGAcgASgEKnsKFUFzc3VtZUFybW9yTWFzdGVyd29yaxIeChpBc3N1bWVBcm1vck1hc3RlcndvcmtfTm9uZRAAEiMKH0Fzc3VtZUFybW9yTWFzdGVyd29ya19MZWdlbmRhcnkQARIdChlBc3N1bWVBcm1vck1hc3RlcndvcmtfQWxsEAIqigEKDkNoYXJhY3Rlck9yZGVyEh0KGUNoYXJhY3Rlck9yZGVyX21vc3RSZWNlbnQQABIkCiBDaGFyYWN0ZXJPcmRlcl9tb3N0UmVjZW50UmV2ZXJzZRABEhgKFENoYXJhY3Rlck9yZGVyX2ZpeGVkEAISGQoVQ2hhcmFjdGVyT3JkZXJfY3VzdG9tEAMqlgEKEkRlc2NyaXB0aW9uT3B0aW9ucxIiCh5EZXNjcmlwdGlvbk9wdGlvbnNfVU5TUEVDSUZJRUQQABIdChlEZXNjcmlwdGlvbk9wdGlvbnNfYnVuZ2llEAESIAocRGVzY3JpcHRpb25PcHRpb25zX2NvbW11bml0eRACEhsKF0Rlc2NyaXB0aW9uT3B0aW9uc19ib3RoEAMqcwoMRGVzdGlueUNsYXNzEhYKEkRlc3RpbnlDbGFzc19UaXRhbhAAEhcKE0Rlc3RpbnlDbGFzc19IdW50ZXIQARIYChREZXN0aW55Q2xhc3NfV2FybG9jaxACEhgKFERlc3RpbnlDbGFzc19Vbmtub3duEAMqaAoPSW5mdXNlRGlyZWN0aW9uEh8KG0luZnVzZURpcmVjdGlvbl9VTlNQRUNJRklFRBAAEhoKFkluZnVzZURpcmVjdGlvbl9JbmZ1c2UQARIYChRJbmZ1c2VEaXJlY3Rpb25fRnVlbBACKkIKDEl0ZW1Qb3B1cFRhYhIZChVJdGVtUG9wdXBUYWJfT3ZlcnZpZXcQABIXChNJdGVtUG9wdXBUYWJfVHJpYWdlEAEqQQoLTG9hZG91dFNvcnQSGgoWTG9hZG91dFNvcnRfQnlFZGl0VGltZRAAEhYKEkxvYWRvdXRTb3J0X0J5TmFtZRABKjkKClNlYXJjaFR5cGUSEwoPU2VhcmNoVHlwZV9JdGVtEAASFgoSU2VhcmNoVHlwZV9Mb2Fkb3V0EAEqjAEKCFRhZ1ZhbHVlEhgKFFRhZ1ZhbHVlX1VOU1BFQ0lGSUVEEAASFQoRVGFnVmFsdWVfZmF2b3JpdGUQARIRCg1UYWdWYWx1ZV9rZWVwEAISEwoPVGFnVmFsdWVfaW5mdXNlEAMSEQoNVGFnVmFsdWVfanVuaxAEEhQKEFRhZ1ZhbHVlX2FyY2hpdmUQBSpjChhWYXVsdFdlYXBvbkdyb3VwaW5nU3R5bGUSIgoeVmF1bHRXZWFwb25Hcm91cGluZ1N0eWxlX0xpbmVzEAASIwofVmF1bHRXZWFwb25Hcm91cGluZ1N0eWxlX0lubGluZRABYgZwcm90bzM");

/**
 * Describes the message stately.generated.ApiApp.
 * Use `create(ApiAppSchema)` to create a new message.
 */
export const ApiAppSchema = /*@__PURE__*/
  messageDesc(file_index, 0);

/**
 * Describes the message stately.generated.ArtifactUnlocks.
 * Use `create(ArtifactUnlocksSchema)` to create a new message.
 */
export const ArtifactUnlocksSchema = /*@__PURE__*/
  messageDesc(file_index, 1);

/**
 * Describes the message stately.generated.CollapsedSection.
 * Use `create(CollapsedSectionSchema)` to create a new message.
 */
export const CollapsedSectionSchema = /*@__PURE__*/
  messageDesc(file_index, 2);

/**
 * Describes the message stately.generated.CustomStatDef.
 * Use `create(CustomStatDefSchema)` to create a new message.
 */
export const CustomStatDefSchema = /*@__PURE__*/
  messageDesc(file_index, 3);

/**
 * Describes the message stately.generated.CustomStatWeightsEntry.
 * Use `create(CustomStatWeightsEntrySchema)` to create a new message.
 */
export const CustomStatWeightsEntrySchema = /*@__PURE__*/
  messageDesc(file_index, 4);

/**
 * Describes the message stately.generated.CustomStatsEntry.
 * Use `create(CustomStatsEntrySchema)` to create a new message.
 */
export const CustomStatsEntrySchema = /*@__PURE__*/
  messageDesc(file_index, 5);

/**
 * Describes the message stately.generated.GlobalSettings.
 * Use `create(GlobalSettingsSchema)` to create a new message.
 */
export const GlobalSettingsSchema = /*@__PURE__*/
  messageDesc(file_index, 6);

/**
 * Describes the message stately.generated.InGameLoadoutIdentifiers.
 * Use `create(InGameLoadoutIdentifiersSchema)` to create a new message.
 */
export const InGameLoadoutIdentifiersSchema = /*@__PURE__*/
  messageDesc(file_index, 7);

/**
 * Describes the message stately.generated.ItemAnnotation.
 * Use `create(ItemAnnotationSchema)` to create a new message.
 */
export const ItemAnnotationSchema = /*@__PURE__*/
  messageDesc(file_index, 8);

/**
 * Describes the message stately.generated.ItemHashTag.
 * Use `create(ItemHashTagSchema)` to create a new message.
 */
export const ItemHashTagSchema = /*@__PURE__*/
  messageDesc(file_index, 9);

/**
 * Describes the message stately.generated.Loadout.
 * Use `create(LoadoutSchema)` to create a new message.
 */
export const LoadoutSchema = /*@__PURE__*/
  messageDesc(file_index, 10);

/**
 * Describes the message stately.generated.LoadoutItem.
 * Use `create(LoadoutItemSchema)` to create a new message.
 */
export const LoadoutItemSchema = /*@__PURE__*/
  messageDesc(file_index, 11);

/**
 * Describes the message stately.generated.LoadoutParameters.
 * Use `create(LoadoutParametersSchema)` to create a new message.
 */
export const LoadoutParametersSchema = /*@__PURE__*/
  messageDesc(file_index, 12);

/**
 * Describes the message stately.generated.LoadoutShare.
 * Use `create(LoadoutShareSchema)` to create a new message.
 */
export const LoadoutShareSchema = /*@__PURE__*/
  messageDesc(file_index, 13);

/**
 * Describes the message stately.generated.ModsByBucketEntry.
 * Use `create(ModsByBucketEntrySchema)` to create a new message.
 */
export const ModsByBucketEntrySchema = /*@__PURE__*/
  messageDesc(file_index, 14);

/**
 * Describes the message stately.generated.Search.
 * Use `create(SearchSchema)` to create a new message.
 */
export const SearchSchema = /*@__PURE__*/
  messageDesc(file_index, 15);

/**
 * Describes the message stately.generated.Settings.
 * Use `create(SettingsSchema)` to create a new message.
 */
export const SettingsSchema = /*@__PURE__*/
  messageDesc(file_index, 16);

/**
 * Describes the message stately.generated.SocketOverride.
 * Use `create(SocketOverrideSchema)` to create a new message.
 */
export const SocketOverrideSchema = /*@__PURE__*/
  messageDesc(file_index, 17);

/**
 * Describes the message stately.generated.StatConstraint.
 * Use `create(StatConstraintSchema)` to create a new message.
 */
export const StatConstraintSchema = /*@__PURE__*/
  messageDesc(file_index, 18);

/**
 * Describes the message stately.generated.StatConstraintsEntry.
 * Use `create(StatConstraintsEntrySchema)` to create a new message.
 */
export const StatConstraintsEntrySchema = /*@__PURE__*/
  messageDesc(file_index, 19);

/**
 * Describes the message stately.generated.Triumph.
 * Use `create(TriumphSchema)` to create a new message.
 */
export const TriumphSchema = /*@__PURE__*/
  messageDesc(file_index, 20);

/**
 * Describes the enum stately.generated.AssumeArmorMasterwork.
 */
export const AssumeArmorMasterworkSchema = /*@__PURE__*/
  enumDesc(file_index, 0);

/**
 * @generated from enum stately.generated.AssumeArmorMasterwork
 */
export const AssumeArmorMasterwork = /*@__PURE__*/
  tsEnum(AssumeArmorMasterworkSchema);

/**
 * Describes the enum stately.generated.CharacterOrder.
 */
export const CharacterOrderSchema = /*@__PURE__*/
  enumDesc(file_index, 1);

/**
 * @generated from enum stately.generated.CharacterOrder
 */
export const CharacterOrder = /*@__PURE__*/
  tsEnum(CharacterOrderSchema);

/**
 * Describes the enum stately.generated.DescriptionOptions.
 */
export const DescriptionOptionsSchema = /*@__PURE__*/
  enumDesc(file_index, 2);

/**
 * @generated from enum stately.generated.DescriptionOptions
 */
export const DescriptionOptions = /*@__PURE__*/
  tsEnum(DescriptionOptionsSchema);

/**
 * Describes the enum stately.generated.DestinyClass.
 */
export const DestinyClassSchema = /*@__PURE__*/
  enumDesc(file_index, 3);

/**
 * @generated from enum stately.generated.DestinyClass
 */
export const DestinyClass = /*@__PURE__*/
  tsEnum(DestinyClassSchema);

/**
 * Describes the enum stately.generated.InfuseDirection.
 */
export const InfuseDirectionSchema = /*@__PURE__*/
  enumDesc(file_index, 4);

/**
 * @generated from enum stately.generated.InfuseDirection
 */
export const InfuseDirection = /*@__PURE__*/
  tsEnum(InfuseDirectionSchema);

/**
 * Describes the enum stately.generated.ItemPopupTab.
 */
export const ItemPopupTabSchema = /*@__PURE__*/
  enumDesc(file_index, 5);

/**
 * @generated from enum stately.generated.ItemPopupTab
 */
export const ItemPopupTab = /*@__PURE__*/
  tsEnum(ItemPopupTabSchema);

/**
 * Describes the enum stately.generated.LoadoutSort.
 */
export const LoadoutSortSchema = /*@__PURE__*/
  enumDesc(file_index, 6);

/**
 * @generated from enum stately.generated.LoadoutSort
 */
export const LoadoutSort = /*@__PURE__*/
  tsEnum(LoadoutSortSchema);

/**
 * Describes the enum stately.generated.SearchType.
 */
export const SearchTypeSchema = /*@__PURE__*/
  enumDesc(file_index, 7);

/**
 * @generated from enum stately.generated.SearchType
 */
export const SearchType = /*@__PURE__*/
  tsEnum(SearchTypeSchema);

/**
 * Describes the enum stately.generated.TagValue.
 */
export const TagValueSchema = /*@__PURE__*/
  enumDesc(file_index, 8);

/**
 * @generated from enum stately.generated.TagValue
 */
export const TagValue = /*@__PURE__*/
  tsEnum(TagValueSchema);

/**
 * Describes the enum stately.generated.VaultWeaponGroupingStyle.
 */
export const VaultWeaponGroupingStyleSchema = /*@__PURE__*/
  enumDesc(file_index, 9);

/**
 * @generated from enum stately.generated.VaultWeaponGroupingStyle
 */
export const VaultWeaponGroupingStyle = /*@__PURE__*/
  tsEnum(VaultWeaponGroupingStyleSchema);


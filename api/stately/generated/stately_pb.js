// @generated by protoc-gen-es v2.0.0 with parameter "target=js+dts,import_extension=.js"
// @generated from file stately.proto (package stately.generated, syntax proto3)
/* eslint-disable */

import { enumDesc, fileDesc, messageDesc, tsEnum } from '@bufbuild/protobuf/codegenv1';

/**
 * Describes the file stately.proto.
 */
export const file_stately =
  /*@__PURE__*/
  fileDesc(
    'Cg1zdGF0ZWx5LnByb3RvEhFzdGF0ZWx5LmdlbmVyYXRlZCJsCgZBcGlBcHASDAoCaWQYASABKAlCABIWCgxidW5naWVBcGlLZXkYAiABKAlCABITCglkaW1BcGlLZXkYAyABKAlCABIQCgZvcmlnaW4YBCABKAlCABITCglwYXJ0aXRpb24YBSABKARCADoAIkcKD0FydGlmYWN0VW5sb2NrcxIcChJ1bmxvY2tlZEl0ZW1IYXNoZXMYASADKA1CABIWCgxzZWFzb25OdW1iZXIYAiABKA1CACI2ChBDb2xsYXBzZWRTZWN0aW9uEg0KA2tleRgBIAEoCUIAEhMKCWNvbGxhcHNlZBgCIAEoCEIAIroBCg1DdXN0b21TdGF0RGVmEhIKCHN0YXRIYXNoGAEgASgNQgASDwoFbGFiZWwYAiABKAlCABIUCgpzaG9ydExhYmVsGAMgASgJQgASMAoFY2xhc3MYBCABKA4yHy5zdGF0ZWx5LmdlbmVyYXRlZC5EZXN0aW55Q2xhc3NCABI8Cgd3ZWlnaHRzGAUgAygLMikuc3RhdGVseS5nZW5lcmF0ZWQuQ3VzdG9tU3RhdFdlaWdodHNFbnRyeUIAIj4KFkN1c3RvbVN0YXRXZWlnaHRzRW50cnkSEgoIc3RhdEhhc2gYASABKA1CABIQCgZ3ZWlnaHQYAiABKAFCACJfChBDdXN0b21TdGF0c0VudHJ5EjQKCWNsYXNzVHlwZRgBIAEoDjIfLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc3RpbnlDbGFzc0IAEhUKC2N1c3RvbVN0YXRzGAIgAygNQgAirQIKDkdsb2JhbFNldHRpbmdzEg8KBXN0YWdlGAEgASgJQgASFwoNZGltQXBpRW5hYmxlZBgCIAEoCEIAEi4KJGRlc3RpbnlQcm9maWxlTWluaW11bVJlZnJlc2hJbnRlcnZhbBgDIAEoEkIAEicKHWRlc3RpbnlQcm9maWxlUmVmcmVzaEludGVydmFsGAQgASgSQgASFQoLYXV0b1JlZnJlc2gYBSABKAhCABIhChdyZWZyZXNoUHJvZmlsZU9uVmlzaWJsZRgGIAEoCEIAEioKIGRpbVByb2ZpbGVNaW5pbXVtUmVmcmVzaEludGVydmFsGAcgASgSQgASGQoPc2hvd0lzc3VlQmFubmVyGAggASgIQgASFQoLbGFzdFVwZGF0ZWQYCSABKBJCADoAIlcKGEluR2FtZUxvYWRvdXRJZGVudGlmaWVycxITCgljb2xvckhhc2gYASABKA1CABISCghpY29uSGFzaBgCIAEoDUIAEhIKCG5hbWVIYXNoGAMgASgNQgAiowEKDkl0ZW1Bbm5vdGF0aW9uEhMKCXByb2ZpbGVJZBgBIAEoBEIAEhgKDmRlc3RpbnlWZXJzaW9uGAIgASgNQgASKgoDdGFnGAMgASgOMhsuc3RhdGVseS5nZW5lcmF0ZWQuVGFnVmFsdWVCABIPCgVub3RlcxgEIAEoCUIAEgwKAmlkGAUgASgEQgASFQoLY3JhZnRlZERhdGUYBiABKBJCADoAIosBCgtJdGVtSGFzaFRhZxITCglwcm9maWxlSWQYASABKARCABIYCg5kZXN0aW55VmVyc2lvbhgCIAEoDUIAEioKA3RhZxgDIAEoDjIbLnN0YXRlbHkuZ2VuZXJhdGVkLlRhZ1ZhbHVlQgASDwoFbm90ZXMYBCABKAlCABIOCgRoYXNoGAUgASgNQgA6ACLzAgoHTG9hZG91dBIMCgJpZBgBIAEoDEIAEg4KBG5hbWUYAiABKAlCABIPCgVub3RlcxgDIAEoCUIAEjQKCWNsYXNzVHlwZRgEIAEoDjIfLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc3RpbnlDbGFzc0IAEjIKCGVxdWlwcGVkGAUgAygLMh4uc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dEl0ZW1CABI0Cgp1bmVxdWlwcGVkGAYgAygLMh4uc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dEl0ZW1CABI6CgpwYXJhbWV0ZXJzGAcgASgLMiQuc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dFBhcmFtZXRlcnNCABITCgljcmVhdGVkQXQYCCABKBJCABIXCg1sYXN0VXBkYXRlZEF0GAkgASgSQgASGAoOZGVzdGlueVZlcnNpb24YCiABKA1CABITCglwcm9maWxlSWQYCyABKARCADoAIpIBCgtMb2Fkb3V0SXRlbRIMCgJpZBgBIAEoBEIAEg4KBGhhc2gYAiABKA1CABIQCgZhbW91bnQYAyABKA1CABI8Cg9zb2NrZXRPdmVycmlkZXMYBCADKAsyIS5zdGF0ZWx5LmdlbmVyYXRlZC5Tb2NrZXRPdmVycmlkZUIAEhUKC2NyYWZ0ZWREYXRlGAUgASgSQgAioAQKEUxvYWRvdXRQYXJhbWV0ZXJzEjwKD3N0YXRDb25zdHJhaW50cxgBIAMoCzIhLnN0YXRlbHkuZ2VuZXJhdGVkLlN0YXRDb25zdHJhaW50QgASDgoEbW9kcxgCIAMoDUIAEhMKCWNsZWFyTW9kcxgDIAEoCEIAEhYKDGNsZWFyV2VhcG9ucxgEIAEoCEIAEhQKCmNsZWFyQXJtb3IYBSABKAhCABI8Cgxtb2RzQnlCdWNrZXQYBiADKAsyJC5zdGF0ZWx5LmdlbmVyYXRlZC5Nb2RzQnlCdWNrZXRFbnRyeUIAEj0KD2FydGlmYWN0VW5sb2NrcxgHIAEoCzIiLnN0YXRlbHkuZ2VuZXJhdGVkLkFydGlmYWN0VW5sb2Nrc0IAEhYKDGF1dG9TdGF0TW9kcxgIIAEoCEIAEg8KBXF1ZXJ5GAkgASgJQgASSQoVYXNzdW1lQXJtb3JNYXN0ZXJ3b3JrGAogASgOMiguc3RhdGVseS5nZW5lcmF0ZWQuQXNzdW1lQXJtb3JNYXN0ZXJ3b3JrQgASGQoPZXhvdGljQXJtb3JIYXNoGAsgASgDQgASSAoRaW5HYW1lSWRlbnRpZmllcnMYDCABKAsyKy5zdGF0ZWx5LmdlbmVyYXRlZC5JbkdhbWVMb2Fkb3V0SWRlbnRpZmllcnNCABIkChppbmNsdWRlUnVudGltZVN0YXRCZW5lZml0cxgNIAEoCEIAIo0DCgxMb2Fkb3V0U2hhcmUSDAoCaWQYASABKAlCABIOCgRuYW1lGAIgASgJQgASDwoFbm90ZXMYAyABKAlCABI0CgljbGFzc1R5cGUYBCABKA4yHy5zdGF0ZWx5LmdlbmVyYXRlZC5EZXN0aW55Q2xhc3NCABIyCghlcXVpcHBlZBgFIAMoCzIeLnN0YXRlbHkuZ2VuZXJhdGVkLkxvYWRvdXRJdGVtQgASNAoKdW5lcXVpcHBlZBgGIAMoCzIeLnN0YXRlbHkuZ2VuZXJhdGVkLkxvYWRvdXRJdGVtQgASOgoKcGFyYW1ldGVycxgHIAEoCzIkLnN0YXRlbHkuZ2VuZXJhdGVkLkxvYWRvdXRQYXJhbWV0ZXJzQgASEwoJY3JlYXRlZEF0GAggASgSQgASFwoNbGFzdFVwZGF0ZWRBdBgJIAEoEkIAEhgKDmRlc3RpbnlWZXJzaW9uGAogASgNQgASEwoJcHJvZmlsZUlkGAsgASgEQgASEwoJdmlld0NvdW50GA8gASgNQgA6ACI+ChFNb2RzQnlCdWNrZXRFbnRyeRIUCgpidWNrZXRIYXNoGAEgASgNQgASEwoJbW9kSGFzaGVzGAIgAygNQgAixgEKBlNlYXJjaBIPCgVxdWVyeRgBIAEoCUIAEhQKCnVzYWdlQ291bnQYAiABKA1CABIPCgVzYXZlZBgDIAEoCEIAEhMKCWxhc3RVc2FnZRgEIAEoEkIAEi0KBHR5cGUYBSABKA4yHS5zdGF0ZWx5LmdlbmVyYXRlZC5TZWFyY2hUeXBlQgASDwoFcWhhc2gYBiABKAxCABITCglwcm9maWxlSWQYByABKARCABIYCg5kZXN0aW55VmVyc2lvbhgIIAEoDUIAOgAipg0KCFNldHRpbmdzEhIKCG1lbWJlcklkGAEgASgEQgASFQoLaXRlbVF1YWxpdHkYAiABKAhCABIWCgxzaG93TmV3SXRlbXMYAyABKAhCABI7Cg5jaGFyYWN0ZXJPcmRlchgEIAEoDjIhLnN0YXRlbHkuZ2VuZXJhdGVkLkNoYXJhY3Rlck9yZGVyQgASHQoTaXRlbVNvcnRPcmRlckN1c3RvbRgFIAMoCUIAEhsKEWl0ZW1Tb3J0UmV2ZXJzYWxzGAYgAygJQgASEQoHY2hhckNvbBgHIAEoDUIAEhcKDWNoYXJDb2xNb2JpbGUYCCABKA1CABISCghpdGVtU2l6ZRgJIAEoDUIAEkAKEWNvbGxhcHNlZFNlY3Rpb25zGAogAygLMiMuc3RhdGVseS5nZW5lcmF0ZWQuQ29sbGFwc2VkU2VjdGlvbkIAEiAKFmNvbXBsZXRlZFJlY29yZHNIaWRkZW4YCyABKAhCABIhChdyZWRhY3RlZFJlY29yZHNSZXZlYWxlZBgMIAEoCEIAEiEKF2Zhcm1pbmdNYWtlUm9vbUZvckl0ZW1zGA0gASgIQgASHgoUaW52ZW50b3J5Q2xlYXJTcGFjZXMYDiABKA1CABIeChRoaWRlQ29tcGxldGVkUmVjb3JkcxgPIAEoCEIAEh0KE2N1c3RvbUNoYXJhY3RlclNvcnQYECADKAlCABI/ChFpbmZ1c2lvbkRpcmVjdGlvbhgRIAEoDjIiLnN0YXRlbHkuZ2VuZXJhdGVkLkluZnVzZURpcmVjdGlvbkIAEhIKCGxhbmd1YWdlGBIgASgJQgASGQoPd2lzaExpc3RTb3VyY2VzGBMgAygJQgASPAoMbG9QYXJhbWV0ZXJzGBQgASgLMiQuc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dFBhcmFtZXRlcnNCABJLChhsb1N0YXRDb25zdHJhaW50c0J5Q2xhc3MYFSADKAsyJy5zdGF0ZWx5LmdlbmVyYXRlZC5TdGF0Q29uc3RyYWludHNFbnRyeUIAEkYKF2N1c3RvbVRvdGFsU3RhdHNCeUNsYXNzGBYgAygLMiMuc3RhdGVseS5nZW5lcmF0ZWQuQ3VzdG9tU3RhdHNFbnRyeUIAEiEKF29yZ2FuaXplckNvbHVtbnNXZWFwb25zGBcgAygJQgASHwoVb3JnYW5pemVyQ29sdW1uc0FybW9yGBggAygJQgASHwoVb3JnYW5pemVyQ29sdW1uc0dob3N0GBkgAygJQgASGgoQY29tcGFyZUJhc2VTdGF0cxgaIAEoCEIAEhoKEHNpZGVjYXJDb2xsYXBzZWQYGyABKAhCABIZCg9zaW5nbGVDaGFyYWN0ZXIYHCABKAhCABIZCg9iYWRnZVBvc3RtYXN0ZXIYHSABKAhCABISCghwZXJrTGlzdBgeIAEoCEIAEjUKC2xvYWRvdXRTb3J0GB8gASgOMh4uc3RhdGVseS5nZW5lcmF0ZWQuTG9hZG91dFNvcnRCABIcChJpdGVtRmVlZEhpZGVUYWdnZWQYICABKAhCABIaChBpdGVtRmVlZEV4cGFuZGVkGCEgASgIQgASIAoWaGlkZVB1bGxGcm9tUG9zdG1hc3RlchgiIAEoCEIAEkYKFWRlc2NyaXB0aW9uc1RvRGlzcGxheRgjIAEoDjIlLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc2NyaXB0aW9uT3B0aW9uc0IAEiEKF2NvbXBhcmVXZWFwb25NYXN0ZXJ3b3JrGCQgASgIQgASGwoRaXRlbUZlZWRXYXRlcm1hcmsYJSABKARCABI3CgtjdXN0b21TdGF0cxgmIAMoCzIgLnN0YXRlbHkuZ2VuZXJhdGVkLkN1c3RvbVN0YXREZWZCABIYCg5hdXRvTG9ja1RhZ2dlZBgnIAEoCEIAEg8KBXRoZW1lGCggASgJQgASHwoVc29ydFJlY29yZFByb2dyZXNzaW9uGCkgASgIQgASIAoWdmVuZG9yc0hpZGVTaWx2ZXJJdGVtcxgqIAEoCEIAEh0KE3ZhdWx0V2VhcG9uR3JvdXBpbmcYKyABKAlCABJPChh2YXVsdFdlYXBvbkdyb3VwaW5nU3R5bGUYLCABKA4yKy5zdGF0ZWx5LmdlbmVyYXRlZC5WYXVsdFdlYXBvbkdyb3VwaW5nU3R5bGVCABI3CgxpdGVtUG9wdXBUYWIYLSABKA4yHy5zdGF0ZWx5LmdlbmVyYXRlZC5JdGVtUG9wdXBUYWJCADoAIjsKDlNvY2tldE92ZXJyaWRlEhUKC3NvY2tldEluZGV4GAEgASgNQgASEgoIaXRlbUhhc2gYAiABKA1CACJKCg5TdGF0Q29uc3RyYWludBISCghzdGF0SGFzaBgBIAEoDUIAEhEKB21pblRpZXIYAiABKA1CABIRCgdtYXhUaWVyGAMgASgNQgAihgEKFFN0YXRDb25zdHJhaW50c0VudHJ5EjQKCWNsYXNzVHlwZRgBIAEoDjIfLnN0YXRlbHkuZ2VuZXJhdGVkLkRlc3RpbnlDbGFzc0IAEjgKC2NvbnN0cmFpbnRzGAIgAygLMiEuc3RhdGVseS5nZW5lcmF0ZWQuU3RhdENvbnN0cmFpbnRCACJQCgdUcml1bXBoEhQKCnJlY29yZEhhc2gYASABKA1CABITCglwcm9maWxlSWQYAiABKARCABIYCg5kZXN0aW55VmVyc2lvbhgHIAEoDUIAOgAqpQEKFUFzc3VtZUFybW9yTWFzdGVyd29yaxIeChpBc3N1bWVBcm1vck1hc3RlcndvcmtfTm9uZRAAEiMKH0Fzc3VtZUFybW9yTWFzdGVyd29ya19MZWdlbmRhcnkQARIdChlBc3N1bWVBcm1vck1hc3RlcndvcmtfQWxsEAISKAokQXNzdW1lQXJtb3JNYXN0ZXJ3b3JrX0FydGlmaWNlRXhvdGljEAMqqgEKDkNoYXJhY3Rlck9yZGVyEh4KGkNoYXJhY3Rlck9yZGVyX1VOU1BFQ0lGSUVEEAASHQoZQ2hhcmFjdGVyT3JkZXJfbW9zdFJlY2VudBABEiQKIENoYXJhY3Rlck9yZGVyX21vc3RSZWNlbnRSZXZlcnNlEAISGAoUQ2hhcmFjdGVyT3JkZXJfZml4ZWQQAxIZChVDaGFyYWN0ZXJPcmRlcl9jdXN0b20QBCqWAQoSRGVzY3JpcHRpb25PcHRpb25zEiIKHkRlc2NyaXB0aW9uT3B0aW9uc19VTlNQRUNJRklFRBAAEh0KGURlc2NyaXB0aW9uT3B0aW9uc19idW5naWUQARIgChxEZXNjcmlwdGlvbk9wdGlvbnNfY29tbXVuaXR5EAISGwoXRGVzY3JpcHRpb25PcHRpb25zX2JvdGgQAypzCgxEZXN0aW55Q2xhc3MSFgoSRGVzdGlueUNsYXNzX1RpdGFuEAASFwoTRGVzdGlueUNsYXNzX0h1bnRlchABEhgKFERlc3RpbnlDbGFzc19XYXJsb2NrEAISGAoURGVzdGlueUNsYXNzX1Vua25vd24QAypoCg9JbmZ1c2VEaXJlY3Rpb24SHwobSW5mdXNlRGlyZWN0aW9uX1VOU1BFQ0lGSUVEEAASGgoWSW5mdXNlRGlyZWN0aW9uX0luZnVzZRABEhgKFEluZnVzZURpcmVjdGlvbl9GdWVsEAIqQgoMSXRlbVBvcHVwVGFiEhkKFUl0ZW1Qb3B1cFRhYl9PdmVydmlldxAAEhcKE0l0ZW1Qb3B1cFRhYl9UcmlhZ2UQASpBCgtMb2Fkb3V0U29ydBIaChZMb2Fkb3V0U29ydF9CeUVkaXRUaW1lEAASFgoSTG9hZG91dFNvcnRfQnlOYW1lEAEqOQoKU2VhcmNoVHlwZRITCg9TZWFyY2hUeXBlX0l0ZW0QABIWChJTZWFyY2hUeXBlX0xvYWRvdXQQASqMAQoIVGFnVmFsdWUSGAoUVGFnVmFsdWVfVU5TUEVDSUZJRUQQABIVChFUYWdWYWx1ZV9mYXZvcml0ZRABEhEKDVRhZ1ZhbHVlX2tlZXAQAhITCg9UYWdWYWx1ZV9pbmZ1c2UQAxIRCg1UYWdWYWx1ZV9qdW5rEAQSFAoQVGFnVmFsdWVfYXJjaGl2ZRAFKmMKGFZhdWx0V2VhcG9uR3JvdXBpbmdTdHlsZRIiCh5WYXVsdFdlYXBvbkdyb3VwaW5nU3R5bGVfTGluZXMQABIjCh9WYXVsdFdlYXBvbkdyb3VwaW5nU3R5bGVfSW5saW5lEAFiBnByb3RvMw',
  );

/**
 * Describes the message stately.generated.ApiApp.
 * Use `create(ApiAppSchema)` to create a new message.
 */
export const ApiAppSchema = /*@__PURE__*/ messageDesc(file_stately, 0);

/**
 * Describes the message stately.generated.ArtifactUnlocks.
 * Use `create(ArtifactUnlocksSchema)` to create a new message.
 */
export const ArtifactUnlocksSchema = /*@__PURE__*/ messageDesc(file_stately, 1);

/**
 * Describes the message stately.generated.CollapsedSection.
 * Use `create(CollapsedSectionSchema)` to create a new message.
 */
export const CollapsedSectionSchema = /*@__PURE__*/ messageDesc(file_stately, 2);

/**
 * Describes the message stately.generated.CustomStatDef.
 * Use `create(CustomStatDefSchema)` to create a new message.
 */
export const CustomStatDefSchema = /*@__PURE__*/ messageDesc(file_stately, 3);

/**
 * Describes the message stately.generated.CustomStatWeightsEntry.
 * Use `create(CustomStatWeightsEntrySchema)` to create a new message.
 */
export const CustomStatWeightsEntrySchema = /*@__PURE__*/ messageDesc(file_stately, 4);

/**
 * Describes the message stately.generated.CustomStatsEntry.
 * Use `create(CustomStatsEntrySchema)` to create a new message.
 */
export const CustomStatsEntrySchema = /*@__PURE__*/ messageDesc(file_stately, 5);

/**
 * Describes the message stately.generated.GlobalSettings.
 * Use `create(GlobalSettingsSchema)` to create a new message.
 */
export const GlobalSettingsSchema = /*@__PURE__*/ messageDesc(file_stately, 6);

/**
 * Describes the message stately.generated.InGameLoadoutIdentifiers.
 * Use `create(InGameLoadoutIdentifiersSchema)` to create a new message.
 */
export const InGameLoadoutIdentifiersSchema = /*@__PURE__*/ messageDesc(file_stately, 7);

/**
 * Describes the message stately.generated.ItemAnnotation.
 * Use `create(ItemAnnotationSchema)` to create a new message.
 */
export const ItemAnnotationSchema = /*@__PURE__*/ messageDesc(file_stately, 8);

/**
 * Describes the message stately.generated.ItemHashTag.
 * Use `create(ItemHashTagSchema)` to create a new message.
 */
export const ItemHashTagSchema = /*@__PURE__*/ messageDesc(file_stately, 9);

/**
 * Describes the message stately.generated.Loadout.
 * Use `create(LoadoutSchema)` to create a new message.
 */
export const LoadoutSchema = /*@__PURE__*/ messageDesc(file_stately, 10);

/**
 * Describes the message stately.generated.LoadoutItem.
 * Use `create(LoadoutItemSchema)` to create a new message.
 */
export const LoadoutItemSchema = /*@__PURE__*/ messageDesc(file_stately, 11);

/**
 * Describes the message stately.generated.LoadoutParameters.
 * Use `create(LoadoutParametersSchema)` to create a new message.
 */
export const LoadoutParametersSchema = /*@__PURE__*/ messageDesc(file_stately, 12);

/**
 * Describes the message stately.generated.LoadoutShare.
 * Use `create(LoadoutShareSchema)` to create a new message.
 */
export const LoadoutShareSchema = /*@__PURE__*/ messageDesc(file_stately, 13);

/**
 * Describes the message stately.generated.ModsByBucketEntry.
 * Use `create(ModsByBucketEntrySchema)` to create a new message.
 */
export const ModsByBucketEntrySchema = /*@__PURE__*/ messageDesc(file_stately, 14);

/**
 * Describes the message stately.generated.Search.
 * Use `create(SearchSchema)` to create a new message.
 */
export const SearchSchema = /*@__PURE__*/ messageDesc(file_stately, 15);

/**
 * Describes the message stately.generated.Settings.
 * Use `create(SettingsSchema)` to create a new message.
 */
export const SettingsSchema = /*@__PURE__*/ messageDesc(file_stately, 16);

/**
 * Describes the message stately.generated.SocketOverride.
 * Use `create(SocketOverrideSchema)` to create a new message.
 */
export const SocketOverrideSchema = /*@__PURE__*/ messageDesc(file_stately, 17);

/**
 * Describes the message stately.generated.StatConstraint.
 * Use `create(StatConstraintSchema)` to create a new message.
 */
export const StatConstraintSchema = /*@__PURE__*/ messageDesc(file_stately, 18);

/**
 * Describes the message stately.generated.StatConstraintsEntry.
 * Use `create(StatConstraintsEntrySchema)` to create a new message.
 */
export const StatConstraintsEntrySchema = /*@__PURE__*/ messageDesc(file_stately, 19);

/**
 * Describes the message stately.generated.Triumph.
 * Use `create(TriumphSchema)` to create a new message.
 */
export const TriumphSchema = /*@__PURE__*/ messageDesc(file_stately, 20);

/**
 * Describes the enum stately.generated.AssumeArmorMasterwork.
 */
export const AssumeArmorMasterworkSchema = /*@__PURE__*/ enumDesc(file_stately, 0);

/**
 * Whether armor of this type will have assumed masterworked stats in the Loadout Optimizer.
 *
 * @generated from enum stately.generated.AssumeArmorMasterwork
 */
export const AssumeArmorMasterwork = /*@__PURE__*/ tsEnum(AssumeArmorMasterworkSchema);

/**
 * Describes the enum stately.generated.CharacterOrder.
 */
export const CharacterOrderSchema = /*@__PURE__*/ enumDesc(file_stately, 1);

/**
 * @generated from enum stately.generated.CharacterOrder
 */
export const CharacterOrder = /*@__PURE__*/ tsEnum(CharacterOrderSchema);

/**
 * Describes the enum stately.generated.DescriptionOptions.
 */
export const DescriptionOptionsSchema = /*@__PURE__*/ enumDesc(file_stately, 2);

/**
 * @generated from enum stately.generated.DescriptionOptions
 */
export const DescriptionOptions = /*@__PURE__*/ tsEnum(DescriptionOptionsSchema);

/**
 * Describes the enum stately.generated.DestinyClass.
 */
export const DestinyClassSchema = /*@__PURE__*/ enumDesc(file_stately, 3);

/**
 * @generated from enum stately.generated.DestinyClass
 */
export const DestinyClass = /*@__PURE__*/ tsEnum(DestinyClassSchema);

/**
 * Describes the enum stately.generated.InfuseDirection.
 */
export const InfuseDirectionSchema = /*@__PURE__*/ enumDesc(file_stately, 4);

/**
 * @generated from enum stately.generated.InfuseDirection
 */
export const InfuseDirection = /*@__PURE__*/ tsEnum(InfuseDirectionSchema);

/**
 * Describes the enum stately.generated.ItemPopupTab.
 */
export const ItemPopupTabSchema = /*@__PURE__*/ enumDesc(file_stately, 5);

/**
 * @generated from enum stately.generated.ItemPopupTab
 */
export const ItemPopupTab = /*@__PURE__*/ tsEnum(ItemPopupTabSchema);

/**
 * Describes the enum stately.generated.LoadoutSort.
 */
export const LoadoutSortSchema = /*@__PURE__*/ enumDesc(file_stately, 6);

/**
 * How the loadouts menu and page should be sorted
 *
 * @generated from enum stately.generated.LoadoutSort
 */
export const LoadoutSort = /*@__PURE__*/ tsEnum(LoadoutSortSchema);

/**
 * Describes the enum stately.generated.SearchType.
 */
export const SearchTypeSchema = /*@__PURE__*/ enumDesc(file_stately, 7);

/**
 * @generated from enum stately.generated.SearchType
 */
export const SearchType = /*@__PURE__*/ tsEnum(SearchTypeSchema);

/**
 * Describes the enum stately.generated.TagValue.
 */
export const TagValueSchema = /*@__PURE__*/ enumDesc(file_stately, 8);

/**
 * @generated from enum stately.generated.TagValue
 */
export const TagValue = /*@__PURE__*/ tsEnum(TagValueSchema);

/**
 * Describes the enum stately.generated.VaultWeaponGroupingStyle.
 */
export const VaultWeaponGroupingStyleSchema = /*@__PURE__*/ enumDesc(file_stately, 9);

/**
 * @generated from enum stately.generated.VaultWeaponGroupingStyle
 */
export const VaultWeaponGroupingStyle = /*@__PURE__*/ tsEnum(VaultWeaponGroupingStyleSchema);

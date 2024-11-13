import { Response } from 'express';
import _ from 'lodash';

/**
 * This is a utility function to extract the types of a subset of value types
 * from an object based on an ordered set of keys. It's useful for typing a
 * postgres insert.
 * @example
 * type MyArgsList = TypesForKeys<{a: string, b: number, c: boolean}, ['a', 'c']>;
 */
export type TypesForKeys<T extends Record<string, any>, K extends (keyof T)[]> = {
  [Index in keyof K]: T[K[Index]];
};

/** Convert a snake_case string to camelCase */
type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : Lowercase<S>;

/**
 * Convert an object to a new object with snake_case keys replaced with camelCase.
 */
export type KeysToCamelCase<T> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [K in keyof T as CamelCase<string & K>]: T[K] extends {} ? KeysToCamelCase<T[K]> : T[K];
};

type UpperCaseLetters =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9';

type SnakeCaseSeq<S extends string> = S extends `${infer P1}${infer P2}`
  ? P1 extends UpperCaseLetters
    ? `_${Lowercase<P1>}${SnakeCaseSeq<P2>}`
    : `${P1}${SnakeCaseSeq<P2>}`
  : Lowercase<S>;

/**
 * Convert a camelCase string to snake_case
 */
export type SnakeCase<S extends string> = S extends `${infer P1}${infer P2}`
  ? `${Lowercase<P1>}${SnakeCaseSeq<P2>}`
  : Lowercase<S>;

type ObjectToSnakeCase<T> = {
  [K in keyof T as SnakeCase<string & K>]: T[K] extends Record<string, any>
    ? KeysToSnakeCase<T[K]>
    : T[K];
};

/**
 * Convert an object to a new object with camelCase keys replaced with snake_case.
 */
export type KeysToSnakeCase<T> = {
  [K in keyof T as SnakeCase<string & K>]: T[K] extends any[]
    ? KeysToSnakeCase<T[K][number]>[]
    : ObjectToSnakeCase<T[K]>;
};

/**
 * Convert an object to a new object with snake_case keys replaced with camelCase.
 */
export function camelize<T extends object>(data: KeysToSnakeCase<T>): T {
  return _.mapKeys(data, (_value, key) => _.camelCase(key)) as T;
}

export function badRequest(res: Response, message: string) {
  res.status(400).send({
    error: 'InvalidRequest',
    message,
  });
}

/**
 * Check whether this could be a real instanced inventory item (just a sequence of numbers)
 */
export function isValidItemId(inventoryItemId: string) {
  return isNumberSequence(inventoryItemId);
}

/**
 * Check whether this could be a real instanced inventory item (just a sequence of numbers)
 */
export function isValidPlatformMembershipId(platformMembershipId: string) {
  return isNumberSequence(platformMembershipId);
}

function isNumberSequence(str: string) {
  return /^\d{1,32}$/.test(str);
}

/**
 * Check whether the platform membership ID provided is in the JWT's list of profile IDs.
 */
export function checkPlatformMembershipId(
  platformMembershipId: string | undefined,
  profileIds: string[],
) {
  if (platformMembershipId) {
    return profileIds.includes(platformMembershipId);
  }
  return true; // This API presumably doesn't require a platformMembershipId
}

/** Produce a new object that's only the key/values of obj that are also keys in defaults and which have values different from defaults. */
export function subtractObject<T extends object>(obj: Partial<T>, defaults: T): Partial<T> {
  const result: Partial<T> = {};
  if (obj) {
    for (const key in defaults) {
      if (obj[key] !== undefined && obj[key] !== defaults[key]) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

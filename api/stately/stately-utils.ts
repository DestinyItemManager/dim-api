// Utilities for dealing with Stately Items (protobufs) and other Stately-specific utilities.

import _ from 'lodash';

/** Recursively convert bigints to regular numbers in an object. */
type ObjectBigIntToNumber<T> = {
  [K in keyof T]: BigIntToNumber<T[K]>;
};

/** Recursively convert bigints to regular numbers in an object. */
export type BigIntToNumber<T> = T extends bigint
  ? number
  : T extends object
    ? ObjectBigIntToNumber<T>
    : T extends (infer K)[]
      ? BigIntToNumber<K>[]
      : T;

/** Recursively convert bigints to regular numbers in an object. */
export function bigIntToNumber<T>(value: T): BigIntToNumber<T> {
  if (typeof value === 'bigint') {
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error(`BigInt value ${value} is too large to convert to a number`);
    }
    return Number(value) as BigIntToNumber<T>;
  } else if (Array.isArray(value)) {
    return value.map(bigIntToNumber) as BigIntToNumber<T>;
  } else if (typeof value === 'object') {
    return _.mapValues(value, bigIntToNumber) as BigIntToNumber<T>;
  }
  return value as BigIntToNumber<T>;
}

/** Recursively convert bigints to regular numbers in an object. */
type ObjectNumberToBigInt<T> = {
  [K in keyof T]: NumberToBigInt<T[K]>;
};

/** Recursively convert bigints to regular numbers in an object. */
export type NumberToBigInt<T> = T extends number
  ? bigint
  : T extends object
    ? ObjectNumberToBigInt<T>
    : T extends (infer K)[]
      ? NumberToBigInt<K>[]
      : T;

/** Recursively convert numbers to bigints in an object. */
export function numberToBigInt<T>(value: T): NumberToBigInt<T> {
  if (typeof value === 'number') {
    return BigInt(value) as NumberToBigInt<T>;
  } else if (Array.isArray(value)) {
    return value.map(numberToBigInt) as NumberToBigInt<T>;
  } else if (typeof value === 'object') {
    return _.mapValues(value, numberToBigInt) as NumberToBigInt<T>;
  }
  return value as NumberToBigInt<T>;
}

/** Strip the protobuf-es $typeName field from a top-level object. */
export function stripTypeName<T extends Record<string, any>>(data: T): Omit<T, '$typeName'> {
  const { $typeName, ...rest } = data;
  return rest;
}

/** Stately doesn't have maps yet, so we have represented them as lists. */
export function listToMap<
  Obj extends object,
  KeyProp extends keyof Obj,
  ValueProp extends keyof Obj,
>(
  keyProp: KeyProp,
  valProp: ValueProp,
  list: Obj[],
): {
  [key: string]: Obj[ValueProp];
} {
  return Object.fromEntries(list.map((s) => [s[keyProp], s[valProp]])) as {
    [key: string]: Obj[ValueProp];
  };
}

/**
 * Extract the string name (without the prefix) from a Stately enum.
 */
export function enumToStringUnion(e: Record<number, string>, v: keyof typeof e): string {
  return e[v].replace(/.*_/, '');
}

/**
 * Convert a Stately enum to a DIM enum by stripping the prefix off it and then
 * looking up the name in the output enum.
 */
export function convertEnum(
  e: Record<number, string>,
  v: keyof typeof e,
  outputEnum: Record<string, number>,
): number {
  return outputEnum[e[v].replace(/.*_/, '')];
}

/**
 * Strips falsy values out of objects.
 */
export function stripDefaults<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.entries(data).reduce<Record<string, unknown>>((result, [key, value]) => {
    if (value || value === false) {
      result[key] = value;
    }
    return result;
  }, {}) as unknown as Partial<T>;
}

/**
 * If the value is explicitly set to null or empty string, we return "clear" which will remove the value from the database.
 * If it's undefined we return null, which will preserve the existing value.
 * If it's set, we'll return the input which will update the existing value.
 */
export function clearValue<T extends string>(val: T | null | undefined): T | 'clear' | null {
  if (val === null || (val !== undefined && val.length === 0)) {
    return 'clear';
  } else if (!val) {
    return null;
  } else {
    return val;
  }
}

const STATELY_MAX_BATCH_SIZE = 50;

/**
 * Yield batches of no more than STATELY_MAX_BATCH_SIZE items from an array.
 * Otherwise you'll get an error from Stately batch APIs.
 */
export function* batches<T>(input: T[]): Generator<T[]> {
  const numBatches = Math.ceil(input.length / STATELY_MAX_BATCH_SIZE);
  for (let i = 0; i < numBatches; i += 1) {
    yield input.slice(i * STATELY_MAX_BATCH_SIZE, (i + 1) * STATELY_MAX_BATCH_SIZE);
  }
}

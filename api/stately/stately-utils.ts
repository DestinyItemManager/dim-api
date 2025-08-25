// Utilities for dealing with Stately Items (protobufs) and other Stately-specific utilities.

import { Transaction as TXN } from '@stately-cloud/client';
import { mapValues } from 'es-toolkit';
import { AllItemTypes, itemTypeToSchema } from './generated/index.js';

export type Transaction = TXN<typeof itemTypeToSchema, AllItemTypes>;

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
  } else if (typeof value === 'object' && value !== null) {
    return mapValues(value, bigIntToNumber) as BigIntToNumber<T>;
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
  } else if (typeof value === 'object' && value !== null) {
    return mapValues(value, numberToBigInt) as NumberToBigInt<T>;
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

export function parseKeyPath(keyPath: string): { ns: string; id: string }[] {
  if (!keyPath.startsWith('/')) {
    throw new Error(`Invalid keyPath ${keyPath}`);
  }
  return keyPath
    .slice(1)
    .split('/')
    .map((p) => {
      const splitIndex = p.indexOf('-');
      const ns = p.slice(0, splitIndex);
      const id = p.slice(splitIndex + 1);
      return { ns, id };
    });
}

/** Convert a UUID from a Stately key path into a string-form UUID. */
export function fromStatelyUUID(id: string): string {
  if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    // It's already in that format
    return id;
  }
  const bytes = Buffer.from(id, 'base64');
  return stringifyUUID(new Uint8Array(bytes));
}

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

// Copied from uuid package but without validation
export function stringifyUUID(arr: Uint8Array, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  return `${
    byteToHex[arr[offset + 0]] +
    byteToHex[arr[offset + 1]] +
    byteToHex[arr[offset + 2]] +
    byteToHex[arr[offset + 3]]
  }-${byteToHex[arr[offset + 4]]}${byteToHex[arr[offset + 5]]}-${byteToHex[arr[offset + 6]]}${
    byteToHex[arr[offset + 7]]
  }-${byteToHex[arr[offset + 8]]}${byteToHex[arr[offset + 9]]}-${byteToHex[arr[offset + 10]]}${
    byteToHex[arr[offset + 11]]
  }${byteToHex[arr[offset + 12]]}${byteToHex[arr[offset + 13]]}${
    byteToHex[arr[offset + 14]]
  }${byteToHex[arr[offset + 15]]}`;
}

// This is a copy of the UUID parsing code from the uuid package, but without
// the validation - I don't really care whether it's a perfectly valid UUID,
// just that it's 16 bytes.
export function parseUUID(uuid: string): Uint8Array {
  let v;
  const arr = new Uint8Array(16); // Parse ########-....-....-....-............

  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = (v >>> 16) & 0xff;
  arr[2] = (v >>> 8) & 0xff;
  arr[3] = v & 0xff; // Parse ........-####-....-....-............

  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 0xff; // Parse ........-....-####-....-............

  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 0xff; // Parse ........-....-....-####-............

  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 0xff; // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

  arr[10] = ((v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000) & 0xff;
  arr[11] = (v / 0x100000000) & 0xff;
  arr[12] = (v >>> 24) & 0xff;
  arr[13] = (v >>> 16) & 0xff;
  arr[14] = (v >>> 8) & 0xff;
  arr[15] = v & 0xff;
  return arr;
}

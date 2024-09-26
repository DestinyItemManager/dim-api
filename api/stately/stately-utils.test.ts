import {
  BigIntToNumber,
  bigIntToNumber,
  clearValue,
  listToMap,
  NumberToBigInt,
  numberToBigInt,
  stripDefaults,
} from './stately-utils.js';

describe('bigIntToNumber', () => {
  it('converts bigints to numbers', () => {
    const input = {
      foo: 1n,
      bar: {
        baz: '3',
        qux: 4n,
      },
    } as const;

    const output: BigIntToNumber<typeof input> = {
      foo: 1,
      bar: {
        baz: '3',
        qux: 4,
      },
    };

    expect(bigIntToNumber(input)).toEqual(output);
  });

  it('converts an empty list to an empty list', () => {
    const input: { key: string; value: string }[] = [];
    const output = bigIntToNumber(input);
    const expected: { key: string; value: string }[] = [];

    expect(output).toEqual(expected);
  });
});

describe('numberToBigInt', () => {
  it('converts numbers to bigints', () => {
    const input = {
      foo: 1,
      bar: {
        baz: '3',
        qux: 4,
      },
    } as const;

    const output: NumberToBigInt<typeof input> = {
      foo: 1n,
      bar: {
        baz: '3',
        qux: 4n,
      },
    };

    expect(numberToBigInt(input)).toEqual(output);
  });

  it('converts an empty list to an empty list', () => {
    const input: { key: string; value: string }[] = [];
    const output = numberToBigInt(input);
    const expected: { key: string; value: string }[] = [];

    expect(output).toEqual(expected);
  });
});

describe('listToMap', () => {
  it('converts a list to a map', () => {
    const input = [
      { key: 'foo', value: 1 },
      { key: 'bar', value: 2 },
    ];
    const output = listToMap('key', 'value', input);
    const expected = {
      foo: 1,
      bar: 2,
    };
    expect(output).toEqual(expected);
  });

  it('converts a list with non string keys to a map', () => {
    const input = [
      { key: 3, value: 'bar' },
      { key: 4, value: 'baz' },
    ];
    const output = listToMap('key', 'value', input);
    const expected = {
      '3': 'bar',
      '4': 'baz',
    };
    expect(output).toEqual(expected);
  });

  it('converts an emptry list to an empty map', () => {
    const input: { key: string; value: string }[] = [];
    const output = listToMap('key', 'value', input);
    const expected: { [key: string]: string } = {};
    expect(output).toEqual(expected);
  });
});

describe('stripDefaults', () => {
  it('strips falsy values out of objects', () => {
    const input = {
      foo: 1,
      bar: undefined,
      baz: null,
      qux: 0,
      qup: '',
      quint: 'hey',
      quop: true,
    } as const;

    const output = {
      foo: 1,
      quint: 'hey',
      quop: true,
    };

    expect(stripDefaults(input)).toEqual(output);
  });
});

describe('clearValue', () => {
  it('returns "clear" for null or empty strings', () => {
    expect(clearValue(null)).toBe('clear');
    expect(clearValue('')).toBe('clear');
  });

  it('returns null for undefined', () => {
    expect(clearValue(undefined)).toBe(null);
  });

  it('returns the input for other values', () => {
    expect(clearValue('foo')).toBe('foo');
  });
});

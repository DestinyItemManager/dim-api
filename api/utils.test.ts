import { camelize } from './utils';

describe('camelize', () => {
  it('camel-cases objects', () => {
    expect(
      camelize({
        foo_bar: 1,
        bar_baz_bing: 2,
        quuxFlux: 3
      })
    ).toEqual({
      fooBar: 1,
      barBazBing: 2,
      quuxFlux: 3
    });
  });
});

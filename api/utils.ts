import _ from 'lodash';

export function camelize<T extends object>(data: object) {
  return _.mapKeys(data, (_value, key) => _.camelCase(key)) as T;
}

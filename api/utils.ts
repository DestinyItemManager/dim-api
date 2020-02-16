import _ from 'lodash';
import { Response } from 'express';

export function camelize<T extends object>(data: object) {
  return _.mapKeys(data, (_value, key) => _.camelCase(key)) as T;
}

export function badRequest(res: Response, message: string) {
  res.status(400).send({
    error: 'InvalidRequest',
    message
  });
}

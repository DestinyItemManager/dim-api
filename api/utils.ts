import _ from 'lodash';

export function camelize<T extends object>(data: object) {
  return _.mapKeys(data, (_value, key) => _.camelCase(key)) as T;
}

export interface UserInfo {
  bungieMembershipId: number;
  appId: string;
}

export function getUser(req): UserInfo {
  return {
    bungieMembershipId: parseInt(req.user.sub, 10),
    appId: req.user.iss
  };
}

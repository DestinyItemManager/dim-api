import { ApiApp } from './shapes/app';
import { UserInfo } from './shapes/user';

declare module 'express-serve-static-core' {
  interface Request {
    jwt?: {
      sub: string;
      iss: string;
      exp: number;
    };

    user?: UserInfo;

    /** Info about the calling app */
    dimApp?: ApiApp;
  }
}

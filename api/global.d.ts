import { JwtPayload } from 'jsonwebtoken';
import { ApiApp } from './shapes/app';
import { UserInfo } from './shapes/user';

declare module 'express-serve-static-core' {
  interface Request {
    jwt?: JwtPayload;

    user?: UserInfo;

    /** Info about the calling app */
    dimApp?: ApiApp;
  }
}

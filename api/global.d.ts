import { JwtPayload } from 'jsonwebtoken';
import { ApiApp } from './shapes/app.js';
import { UserInfo } from './shapes/user.js';

declare module 'express-serve-static-core' {
  interface Request {
    jwt?: JwtPayload;

    user?: UserInfo;

    /** Info about the calling app */
    dimApp?: ApiApp;
  }
}

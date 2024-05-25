declare namespace Express {
  export interface Request {
    jwt?: JwtPayload;

    user?: UserInfo;

    /** Info about the calling app */
    dimApp?: ApiApp;
  }
}

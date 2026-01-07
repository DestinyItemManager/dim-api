import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      login: string;
      name: string | null;
      avatarUrl: string;
      isTeamMember: boolean;
    };
  }
}

import connectPgSimple from 'connect-pg-simple';
import express, { Router } from 'express';
import session from 'express-session';
import { pool } from '../db/index.js';
import { githubAuthRouter, requireAuth } from './middleware/github-auth.js';

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
/** DIM API Admin Panel Router */

const PgSession = connectPgSimple(session);

export const adminRouter = Router();

// Session configuration - must be first

adminRouter.use(
  session({
    store: new PgSession({
      pool, // Reuse existing connection pool
      tableName: 'session',
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15, // Auto-cleanup every 15 minutes
    }),
    secret: process.env.ADMIN_SESSION_SECRET || 'default-secret-for-testing',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
    name: 'dim-admin-session',
  }),
);

// Body parsing middleware
adminRouter.use(express.urlencoded({ extended: true, limit: '1mb' }));

// GitHub OAuth authentication routes
adminRouter.use('/auth', githubAuthRouter);

// Home/Dashboard - protected route
adminRouter.get('/', requireAuth, (req, res) => {
  res.render('admin/views/index', {
    user: req.session.user,
  });
});

// Add App tool routes - protected routes
adminRouter.get('/add-app', requireAuth, (req, res) => {
  res.render('admin/views/add-app', {
    user: req.session.user,
    error: req.query.error,
    success: req.query.success,
  });
});

adminRouter.post('/add-app', requireAuth, (_req, res) => {
  // TODO: Implement add app logic
  res.redirect('/admin/add-app?success=1');
});

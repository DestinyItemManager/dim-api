import express, { Router } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db/index.js';

/** DIM API Admin Panel Router */

const PgSession = connectPgSimple(session);

export const adminRouter = Router();

// Session configuration - must be first
adminRouter.use(
  session({
    store: new PgSession({
      pool: pool, // Reuse existing connection pool
      tableName: 'session',
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15, // Auto-cleanup every 15 minutes
    }),
    secret: process.env.ADMIN_SESSION_SECRET!,
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

// Basic routes structure

// Home/Dashboard
adminRouter.get('/', (req, res) => {
  // TODO: Add authentication check
  res.render('admin/index', {
    user: req.session.user,
  });
});

// Authentication routes (placeholders for now)
adminRouter.get('/auth/login', (_req, res) => {
  // TODO: Implement GitHub OAuth login
  res.send('GitHub OAuth login - to be implemented');
});

adminRouter.get('/auth/callback', (_req, res) => {
  // TODO: Implement GitHub OAuth callback
  res.send('GitHub OAuth callback - to be implemented');
});

adminRouter.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/admin');
  });
});

// Add App tool routes (placeholders for now)
adminRouter.get('/add-app', (req, res) => {
  // TODO: Add authentication check
  res.render('admin/add-app', {
    user: req.session.user,
    error: req.query.error,
    success: req.query.success,
  });
});

adminRouter.post('/add-app', (req, res) => {
  // TODO: Implement add app logic
  res.redirect('/admin/add-app?success=1');
});

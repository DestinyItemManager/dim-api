import { OAuthApp } from '@octokit/oauth-app';
import { Octokit } from '@octokit/rest';
import { NextFunction, Request, Response, Router } from 'express';

/**
 * GitHub OAuth middleware for admin panel authentication
 */

// GitHub organization and team to verify
const GITHUB_ORG = 'DestinyItemManager';
const GITHUB_TEAM = 'developers';

// Initialize OAuth App
const oauthApp = new OAuthApp({
  clientType: 'oauth-app',
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
});

// OAuth Routes
export const githubAuthRouter = Router();

/**
 * Initiate GitHub OAuth flow
 * GET /auth/login
 */
githubAuthRouter.get('/login', (_req, res) => {
  const { url } = oauthApp.getWebFlowAuthorizationUrl({
    state: crypto.randomUUID(),
    scopes: ['read:org'],
    allowSignup: false,
  });
  res.redirect(url);
});

/**
 * Handle GitHub OAuth callback
 * GET /auth/callback
 */
githubAuthRouter.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  try {
    // Exchange code for token
    const { authentication } = await oauthApp.createToken({
      code,
    });

    // Create authenticated Octokit instance
    const octokit = new Octokit({
      auth: authentication.token,
    });

    // Fetch user info
    const { data: user } = await octokit.users.getAuthenticated();

    // Verify team membership
    let isTeamMember = false;
    try {
      await octokit.teams.getMembershipForUserInOrg({
        org: GITHUB_ORG,
        team_slug: GITHUB_TEAM,
        username: user.login,
      });
      isTeamMember = true;
    } catch (error) {
      // 404 means user is not a team member
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status: number }).status !== 404
      ) {
        console.error('Error checking team membership:', error);
      }
    }

    // Store user info in session
    req.session.user = {
      id: user.id,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      isTeamMember,
    };

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).send('Failed to create session');
      }

      // Redirect based on team membership
      if (isTeamMember) {
        res.redirect('/admin');
      } else {
        const user = req.session.user;
        if (!user) {
          throw new Error('User should exist after OAuth');
        }
        res.status(403).render('admin/views/403', {
          user,
          message: `Access denied. You must be a member of ${GITHUB_ORG}/${GITHUB_TEAM} to access the admin panel.`,
        });
      }
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

/**
 * Logout and destroy session
 * GET /auth/logout
 */
githubAuthRouter.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/admin');
  });
});

/**
 * Middleware to require authentication and team membership
 * Use this to protect admin routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user;

  if (!user) {
    // Not logged in - redirect to login
    return res.redirect('/admin/auth/login');
  }

  if (!user.isTeamMember) {
    // Logged in but not a team member
    return res.status(403).render('admin/views/403', {
      user,
      message: `Access denied. You must be a member of ${GITHUB_ORG}/${GITHUB_TEAM} to access the admin panel.`,
    });
  }

  // User is authenticated and authorized
  next();
}

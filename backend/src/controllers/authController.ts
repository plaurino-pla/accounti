import { Request, Response } from 'express';
import { google } from 'googleapis';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

export const googleAuthController = {
  getAuthUrl: (req: Request, res: Response) => {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      });
      
      res.json({ authUrl });
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  },

  handleCallback: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code required' });
      }

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Create or update user in database
      const userService = new UserService();
      const user = await userService.createOrUpdateUser({
        googleId: userInfo.data.id!,
        email: userInfo.data.email!,
        name: userInfo.data.name!,
        picture: userInfo.data.picture || undefined,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date || undefined
      });

      // Generate JWT token
      const jwtToken = userService.generateJWT(user.id);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          subscription: user.subscription
        },
        token: jwtToken
      });
    } catch (error) {
      logger.error('Error handling OAuth callback:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  },

  refreshToken: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();

      return res.json({
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date
      });
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return res.status(500).json({ error: 'Token refresh failed' });
    }
  },

  logout: (req: Request, res: Response) => {
    try {
      // Clear user session/tokens
      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Error during logout:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  }
}; 
import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Google OAuth2 configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback'
);

// Gmail API scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

// Google Drive API scopes
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

// Combined scopes for full access
const ALL_SCOPES = [
  ...GMAIL_SCOPES,
  ...DRIVE_SCOPES,
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Generate Google OAuth2 URL
router.get('/google/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ALL_SCOPES,
    prompt: 'consent'
  });
  
  res.json({ authUrl });
});

// Handle Google OAuth2 callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Create or update user in database
    const user = {
      uid: userInfo.data.id,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
      gmailConnected: false,
      driveConnected: false,
      onboardingCompleted: false,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };

    // In development mode, use mock database
    if (process.env.NODE_ENV === 'development') {
      // Mock user creation/update
      console.log('Mock user created/updated:', user.email);
    } else {
      // TODO: Save user to Firebase/Firestore
    }

    // Redirect to frontend with user data
    const userData = encodeURIComponent(JSON.stringify(user));
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/onboarding?user=${userData}`);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
});

// Connect Gmail specifically
router.post('/connect/gmail', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // In development mode, simulate Gmail connection
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Gmail connection for user:', userId);
      return res.json({ 
        success: true, 
        message: 'Gmail connected successfully',
        gmailConnected: true 
      });
    }

    // TODO: Implement real Gmail connection
    return res.json({ error: 'Gmail connection not implemented in production yet' });

  } catch (error) {
    console.error('Gmail connection error:', error);
    return res.status(500).json({ error: 'Failed to connect Gmail' });
  }
});

// Connect Google Drive specifically
router.post('/connect/drive', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // In development mode, simulate Drive connection
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Google Drive connection for user:', userId);
      return res.json({ 
        success: true, 
        message: 'Google Drive connected successfully',
        driveConnected: true 
      });
    }

    // TODO: Implement real Drive connection
    return res.json({ error: 'Google Drive connection not implemented in production yet' });

  } catch (error) {
    console.error('Google Drive connection error:', error);
    return res.status(500).json({ error: 'Failed to connect Google Drive' });
  }
});

// Complete onboarding
router.post('/onboarding/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // In development mode, simulate onboarding completion
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock onboarding completion for user:', userId);
      return res.json({ 
        success: true, 
        message: 'Onboarding completed successfully',
        onboardingCompleted: true 
      });
    }

    // TODO: Update user in database
    return res.json({ error: 'Onboarding completion not implemented in production yet' });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    return res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // In development mode, return mock user
    if (process.env.NODE_ENV === 'development') {
      const mockUser = {
        uid: 'mock-user-id',
        email: 'user@example.com',
        name: 'Mock User',
        picture: 'https://via.placeholder.com/40',
        gmailConnected: true,
        driveConnected: true,
        onboardingCompleted: true
      };
      return res.json(mockUser);
    }

    // TODO: Get user from database
    return res.json({ error: 'User profile not implemented in production yet' });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Sign out
router.post('/signout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Clear any stored tokens/sessions
    return res.json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(500).json({ error: 'Failed to sign out' });
  }
});

export default router; 
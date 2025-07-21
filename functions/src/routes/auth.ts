import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';

const router = express.Router();
const db = admin.firestore();

// Google OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes required for the application
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Generate OAuth URL
router.get('/url', (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent to get refresh token
    });
    
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      return res.status(400).json({ error: 'Failed to get user email' });
    }

    // Create or update user in Firestore
    const userData = {
      uid: userInfo.data.id || userInfo.data.email,
      email: userInfo.data.email,
      name: userInfo.data.name || '',
      picture: userInfo.data.picture || '',
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userData.uid).set(userData, { merge: true });

    // Redirect to frontend with user data
    const frontendUrl = process.env.FRONTEND_URL || 'https://accounti-4698b.web.app';
    const userParam = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`${frontendUrl}?user=${userParam}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    if (!userData?.refreshToken) {
      return res.status(400).json({ error: 'No refresh token available' });
    }

    // Set credentials and refresh token
    oauth2Client.setCredentials({
      refresh_token: userData.refreshToken
    });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update user with new tokens
    await db.collection('users').doc(userId).update({
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || userData.refreshToken,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      accessToken: credentials.access_token 
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Validate token endpoint
router.post('/validate', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Test the token by making a simple API call
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    await oauth2.userinfo.get();

    res.json({ valid: true });

  } catch (error) {
    console.error('Token validation error:', error);
    res.json({ valid: false });
  }
});

export default router; 
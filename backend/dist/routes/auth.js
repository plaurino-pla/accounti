"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const router = express_1.default.Router();
const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback');
const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
];
const DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
];
const ALL_SCOPES = [
    ...GMAIL_SCOPES,
    ...DRIVE_SCOPES,
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];
router.get('/google/url', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ALL_SCOPES,
        prompt: 'consent'
    });
    res.json({ authUrl });
});
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code not provided' });
        }
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
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
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock user created/updated:', user.email);
        }
        else {
        }
        const userData = encodeURIComponent(JSON.stringify(user));
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/onboarding?user=${userData}`);
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
});
router.post('/connect/gmail', async (req, res) => {
    try {
        const { userId } = req.body;
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock Gmail connection for user:', userId);
            return res.json({
                success: true,
                message: 'Gmail connected successfully',
                gmailConnected: true
            });
        }
        return res.json({ error: 'Gmail connection not implemented in production yet' });
    }
    catch (error) {
        console.error('Gmail connection error:', error);
        return res.status(500).json({ error: 'Failed to connect Gmail' });
    }
});
router.post('/connect/drive', async (req, res) => {
    try {
        const { userId } = req.body;
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock Google Drive connection for user:', userId);
            return res.json({
                success: true,
                message: 'Google Drive connected successfully',
                driveConnected: true
            });
        }
        return res.json({ error: 'Google Drive connection not implemented in production yet' });
    }
    catch (error) {
        console.error('Google Drive connection error:', error);
        return res.status(500).json({ error: 'Failed to connect Google Drive' });
    }
});
router.post('/onboarding/complete', async (req, res) => {
    try {
        const { userId } = req.body;
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock onboarding completion for user:', userId);
            return res.json({
                success: true,
                message: 'Onboarding completed successfully',
                onboardingCompleted: true
            });
        }
        return res.json({ error: 'Onboarding completion not implemented in production yet' });
    }
    catch (error) {
        console.error('Onboarding completion error:', error);
        return res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});
router.get('/profile', async (req, res) => {
    try {
        const { userId } = req.query;
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
        return res.json({ error: 'User profile not implemented in production yet' });
    }
    catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Failed to get user profile' });
    }
});
router.post('/signout', (req, res) => {
    try {
        return res.json({ success: true, message: 'Signed out successfully' });
    }
    catch (error) {
        console.error('Sign out error:', error);
        return res.status(500).json({ error: 'Failed to sign out' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
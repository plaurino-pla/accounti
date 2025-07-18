"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthController = void 0;
const googleapis_1 = require("googleapis");
const userService_1 = require("../services/userService");
const logger_1 = require("../utils/logger");
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
];
exports.googleAuthController = {
    getAuthUrl: (req, res) => {
        try {
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent'
            });
            res.json({ authUrl });
        }
        catch (error) {
            logger_1.logger.error('Error generating auth URL:', error);
            res.status(500).json({ error: 'Failed to generate auth URL' });
        }
    },
    handleCallback: async (req, res) => {
        try {
            const { code } = req.query;
            if (!code) {
                return res.status(400).json({ error: 'Authorization code required' });
            }
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            const userService = new userService_1.UserService();
            const user = await userService.createOrUpdateUser({
                googleId: userInfo.data.id,
                email: userInfo.data.email,
                name: userInfo.data.name,
                picture: userInfo.data.picture || undefined,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                tokenExpiry: tokens.expiry_date || undefined
            });
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
        }
        catch (error) {
            logger_1.logger.error('Error handling OAuth callback:', error);
            return res.status(500).json({ error: 'Authentication failed' });
        }
    },
    refreshToken: async (req, res) => {
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
        }
        catch (error) {
            logger_1.logger.error('Error refreshing token:', error);
            return res.status(500).json({ error: 'Token refresh failed' });
        }
    },
    logout: (req, res) => {
        try {
            return res.json({ message: 'Logged out successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error during logout:', error);
            return res.status(500).json({ error: 'Logout failed' });
        }
    }
};
//# sourceMappingURL=authController.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const firebase_1 = require("../services/firebase");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        console.log('Auth middleware - token:', token);
        console.log('Auth middleware - NODE_ENV:', process.env.NODE_ENV);
        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        const decodedToken = await firebase_1.mockAuth.verifyIdToken(token);
        console.log('Auth middleware - decoded token:', decodedToken);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.name
        };
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=auth.js.map
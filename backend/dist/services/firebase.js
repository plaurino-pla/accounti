"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.mockAuth = exports.db = exports.auth = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const mockDb_1 = require("./mockDb");
let app;
try {
    const serviceAccount = require('../../firebase-service-account.json');
    if (!firebase_admin_1.default.apps.length) {
        app = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    }
    else {
        app = firebase_admin_1.default.app();
    }
}
catch (error) {
    console.warn('Firebase service account not found, using development mode');
    if (!firebase_admin_1.default.apps.length) {
        app = firebase_admin_1.default.initializeApp({
            projectId: 'accounti-4698b'
        });
    }
    else {
        app = firebase_admin_1.default.app();
    }
}
exports.auth = (0, auth_1.getAuth)(app);
exports.db = (0, firestore_1.getFirestore)(app);
const isDevelopment = process.env.NODE_ENV === 'development';
exports.mockAuth = {
    verifyIdToken: async (token) => {
        if (isDevelopment && (token === 'mock-token' || token.startsWith('mock-'))) {
            return {
                uid: 'mock-user-id',
                email: 'user@example.com',
                name: 'Mock User'
            };
        }
        return exports.auth.verifyIdToken(token);
    },
    createCustomToken: async (uid) => {
        if (isDevelopment) {
            return 'mock-custom-token';
        }
        return exports.auth.createCustomToken(uid);
    },
    getUserByEmail: async (email) => {
        if (isDevelopment) {
            return {
                uid: 'mock-user-id',
                email: email,
                displayName: 'Mock User'
            };
        }
        return exports.auth.getUserByEmail(email);
    }
};
const getDb = () => {
    return isDevelopment ? mockDb_1.mockDb : exports.db;
};
exports.getDb = getDb;
//# sourceMappingURL=firebase.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const firebase_1 = require("./firebase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
class UserService {
    constructor() {
        this.usersCollection = firebase_1.db.collection('users');
    }
    async createOrUpdateUser(userData) {
        try {
            const existingUser = await this.getUserByGoogleId(userData.googleId);
            if (existingUser) {
                const updateData = {
                    ...userData,
                    updatedAt: new Date()
                };
                await this.usersCollection.doc(existingUser.id).update(updateData);
                return { ...existingUser, ...updateData };
            }
            else {
                const newUser = {
                    id: '',
                    googleId: userData.googleId,
                    email: userData.email,
                    name: userData.name,
                    picture: userData.picture,
                    subscription: 'free',
                    configuration: {
                        folderTemplate: '{Proveedor}_{Fecha}_{NºFactura}_{Monto}',
                        rootFolder: 'Facturas',
                        historicalRange: 30,
                        syncFrequency: 'daily'
                    },
                    accessToken: userData.accessToken,
                    refreshToken: userData.refreshToken,
                    tokenExpiry: userData.tokenExpiry,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const docRef = await this.usersCollection.add(newUser);
                newUser.id = docRef.id;
                await this.usersCollection.doc(docRef.id).update({ id: docRef.id });
                return newUser;
            }
        }
        catch (error) {
            logger_1.logger.error('Error creating/updating user:', error);
            throw error;
        }
    }
    async getUserById(id) {
        try {
            const doc = await this.usersCollection.doc(id).get();
            if (!doc.exists)
                return null;
            return { id: doc.id, ...doc.data() };
        }
        catch (error) {
            logger_1.logger.error('Error getting user by ID:', error);
            throw error;
        }
    }
    async getUserByGoogleId(googleId) {
        try {
            const snapshot = await this.usersCollection.where('googleId', '==', googleId).limit(1).get();
            if (snapshot.empty)
                return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        catch (error) {
            logger_1.logger.error('Error getting user by Google ID:', error);
            throw error;
        }
    }
    async getUserByEmail(email) {
        try {
            const snapshot = await this.usersCollection.where('email', '==', email).limit(1).get();
            if (snapshot.empty)
                return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        catch (error) {
            logger_1.logger.error('Error getting user by email:', error);
            throw error;
        }
    }
    async updateUserConfiguration(userId, configuration) {
        try {
            await this.usersCollection.doc(userId).update({
                'configuration': configuration,
                updatedAt: new Date()
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating user configuration:', error);
            throw error;
        }
    }
    async updateSubscription(userId, subscription) {
        try {
            await this.usersCollection.doc(userId).update({
                subscription,
                updatedAt: new Date()
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating user subscription:', error);
            throw error;
        }
    }
    async updateUserProfile(userId, profile) {
        try {
            await this.usersCollection.doc(userId).update({
                ...profile,
                updatedAt: new Date()
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating user profile:', error);
            throw error;
        }
    }
    generateJWT(userId) {
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        return jsonwebtoken_1.default.sign({
            userId,
            iat: Math.floor(Date.now() / 1000)
        }, secret, { expiresIn });
    }
    verifyJWT(token) {
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        try {
            return jsonwebtoken_1.default.verify(token, secret);
        }
        catch (error) {
            logger_1.logger.error('JWT verification failed:', error);
            throw new Error('Invalid token');
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=userService.js.map
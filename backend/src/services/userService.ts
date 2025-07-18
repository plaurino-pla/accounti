import { db } from './firebase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  subscription: 'free' | 'pro' | 'premium';
  configuration: UserConfiguration;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserConfiguration {
  folderTemplate: string;
  rootFolder: string;
  historicalRange: number;
  syncFrequency: 'daily' | '6h' | 'hourly';
  googleDriveFolderId?: string;
  googleSheetId?: string;
}

export class UserService {
  private usersCollection = db.collection('users');

  async createOrUpdateUser(userData: Partial<User>): Promise<User> {
    try {
      const existingUser = await this.getUserByGoogleId(userData.googleId!);
      
      if (existingUser) {
        // Update existing user
        const updateData = {
          ...userData,
          updatedAt: new Date()
        };
        
        await this.usersCollection.doc(existingUser.id).update(updateData);
        return { ...existingUser, ...updateData };
      } else {
        // Create new user
        const newUser: User = {
          id: '',
          googleId: userData.googleId!,
          email: userData.email!,
          name: userData.name!,
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
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const doc = await this.usersCollection.doc(id).get();
      if (!doc.exists) return null;
      
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    try {
      const snapshot = await this.usersCollection.where('googleId', '==', googleId).limit(1).get();
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      logger.error('Error getting user by Google ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await this.usersCollection.where('email', '==', email).limit(1).get();
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  async updateUserConfiguration(userId: string, configuration: Partial<UserConfiguration>): Promise<void> {
    try {
      await this.usersCollection.doc(userId).update({
        'configuration': configuration,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating user configuration:', error);
      throw error;
    }
  }

  async updateSubscription(userId: string, subscription: 'free' | 'pro' | 'premium'): Promise<void> {
    try {
      await this.usersCollection.doc(userId).update({
        subscription,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating user subscription:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, profile: { name?: string; picture?: string }): Promise<void> {
    try {
      await this.usersCollection.doc(userId).update({
        ...profile,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  generateJWT(userId: string): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    return jwt.sign(
      { 
        userId,
        iat: Math.floor(Date.now() / 1000)
      },
      secret as jwt.Secret,
      { expiresIn }
    );
  }

  verifyJWT(token: string): { userId: string; iat: number } {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    
    try {
      return jwt.verify(token, secret) as { userId: string; iat: number };
    } catch (error) {
      logger.error('JWT verification failed:', error);
      throw new Error('Invalid token');
    }
  }
} 
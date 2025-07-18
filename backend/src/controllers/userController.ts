import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';

export const userController = {
  getProfile: async (req: Request, res: Response) => {
    try {
      const user = req.user;
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        subscription: user.subscription,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const { name, picture } = req.body;
      const userService = new UserService();
      
      // Update user profile directly in the users collection
      await userService.updateUserProfile(req.user.id, { name, picture });
      
      return res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  getConfiguration: async (req: Request, res: Response) => {
    try {
      const user = req.user;
      
      res.json(user.configuration);
    } catch (error) {
      logger.error('Error getting user configuration:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  },

  updateConfiguration: async (req: Request, res: Response) => {
    try {
      const { folderTemplate, rootFolder, historicalRange, syncFrequency } = req.body;
      const userService = new UserService();
      
      await userService.updateUserConfiguration(req.user.id, {
        folderTemplate,
        rootFolder,
        historicalRange,
        syncFrequency
      });
      
      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      logger.error('Error updating user configuration:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }
}; 
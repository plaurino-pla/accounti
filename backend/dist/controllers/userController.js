"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const userService_1 = require("../services/userService");
const logger_1 = require("../utils/logger");
exports.userController = {
    getProfile: async (req, res) => {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting user profile:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    },
    updateProfile: async (req, res) => {
        try {
            const { name, picture } = req.body;
            const userService = new userService_1.UserService();
            await userService.updateUserProfile(req.user.id, { name, picture });
            return res.json({ message: 'Profile updated successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error updating user profile:', error);
            return res.status(500).json({ error: 'Failed to update profile' });
        }
    },
    getConfiguration: async (req, res) => {
        try {
            const user = req.user;
            res.json(user.configuration);
        }
        catch (error) {
            logger_1.logger.error('Error getting user configuration:', error);
            res.status(500).json({ error: 'Failed to get configuration' });
        }
    },
    updateConfiguration: async (req, res) => {
        try {
            const { folderTemplate, rootFolder, historicalRange, syncFrequency } = req.body;
            const userService = new userService_1.UserService();
            await userService.updateUserConfiguration(req.user.id, {
                folderTemplate,
                rootFolder,
                historicalRange,
                syncFrequency
            });
            res.json({ message: 'Configuration updated successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error updating user configuration:', error);
            res.status(500).json({ error: 'Failed to update configuration' });
        }
    }
};
//# sourceMappingURL=userController.js.map
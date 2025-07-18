"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = void 0;
const logger_1 = require("../utils/logger");
exports.webhookController = {
    handleGmailWebhook: async (req, res) => {
        try {
            const { message } = req.body;
            if (!message || !message.data) {
                return res.status(400).json({ error: 'Invalid webhook payload' });
            }
            const data = Buffer.from(message.data, 'base64').toString();
            const payload = JSON.parse(data);
            logger_1.logger.info('Gmail webhook received:', payload);
            res.json({ received: true });
        }
        catch (error) {
            logger_1.logger.error('Error handling Gmail webhook:', error);
            res.status(500).json({ error: 'Webhook handling failed' });
        }
    },
    handleStripeWebhook: async (req, res) => {
        try {
            const { subscriptionController } = require('./subscriptionController');
            return subscriptionController.handleWebhook(req, res);
        }
        catch (error) {
            logger_1.logger.error('Error handling Stripe webhook:', error);
            res.status(500).json({ error: 'Webhook handling failed' });
        }
    }
};
//# sourceMappingURL=webhookController.js.map
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export const webhookController = {
  handleGmailWebhook: async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message || !message.data) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }
      
      // Decode base64 message data
      const data = Buffer.from(message.data, 'base64').toString();
      const payload = JSON.parse(data);
      
      logger.info('Gmail webhook received:', payload);
      
      // Process the email notification
      // This would trigger invoice processing for the specific user
      
      res.json({ received: true });
    } catch (error) {
      logger.error('Error handling Gmail webhook:', error);
      res.status(500).json({ error: 'Webhook handling failed' });
    }
  },

  handleStripeWebhook: async (req: Request, res: Response) => {
    try {
      // This is handled by the subscription controller
      // Redirect to subscription controller's webhook handler
      const { subscriptionController } = require('./subscriptionController');
      return subscriptionController.handleWebhook(req, res);
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      res.status(500).json({ error: 'Webhook handling failed' });
    }
  }
}; 
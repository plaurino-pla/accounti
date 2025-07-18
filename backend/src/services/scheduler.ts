import cron from 'node-cron';
import { logger } from '../utils/logger';
import { InvoiceService } from './invoiceService';

export const initializeScheduler = () => {
  // Free tier: daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running Free tier invoice processing');
    try {
      const invoiceService = new InvoiceService();
      // Process invoices for free tier users
      logger.info('Free tier processing completed');
    } catch (error) {
      logger.error('Free tier processing failed:', error);
    }
  });

  // Pro tier: every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running Pro tier invoice processing');
    try {
      const invoiceService = new InvoiceService();
      // Process invoices for pro tier users
      logger.info('Pro tier processing completed');
    } catch (error) {
      logger.error('Pro tier processing failed:', error);
    }
  });

  // Premium tier: every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running Premium tier invoice processing');
    try {
      const invoiceService = new InvoiceService();
      // Process invoices for premium tier users
      logger.info('Premium tier processing completed');
    } catch (error) {
      logger.error('Premium tier processing failed:', error);
    }
  });

  logger.info('Scheduler initialized successfully');
}; 
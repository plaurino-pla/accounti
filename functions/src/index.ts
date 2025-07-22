import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Import routes
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import accountRoutes from './routes/account';
import driveRoutes from './routes/drive';
import sheetsRoutes from './routes/sheets';
import adminRoutes from './routes/admin';
import gmailRoutes from './routes/gmail';

// Import scheduler service
import { SchedulerService } from './services/scheduler';

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/account', accountRoutes);
app.use('/drive', driveRoutes);
app.use('/sheets', sheetsRoutes);
app.use('/admin', adminRoutes);
app.use('/gmail', gmailRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);

// Scheduled function for automated invoice processing (every 6 hours)
export const scheduledInvoiceProcessing = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    console.log('Starting scheduled invoice processing...');
    
    const schedulerService = new SchedulerService();
    
    try {
      // Get all users with valid access tokens
      const users = await schedulerService.getUsersForScheduledProcessing();
      console.log(`Found ${users.length} users for scheduled processing`);
      
      const results: any[] = [];
      
      // Process invoices for each user
      for (const user of users) {
        try {
          const result = await schedulerService.processUserInvoices(user.userId, user.accessToken);
          results.push(result);
          console.log(`Completed processing for user ${user.userId}: ${result.invoicesFound} invoices found`);
        } catch (error) {
          console.error(`Error processing user ${user.userId}:`, error);
          results.push({
            userId: user.userId,
            error: (error as Error).message,
            emailsScanned: 0,
            invoicesFound: 0
          });
        }
      }
      
      console.log('Scheduled processing completed:', {
        totalUsers: users.length,
        totalInvoicesFound: results.reduce((sum, r) => sum + (r.invoicesFound || 0), 0),
        totalErrors: results.filter(r => r.error).length
      });
      
      return { success: true, results };
    } catch (error) {
      console.error('Scheduled processing failed:', error);
      throw error;
    }
  }); 
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

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/account', accountRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app); 
import express from 'express';
import * as admin from 'firebase-admin';
import { DriveService } from '../services/driveService';
import { SheetsService } from '../services/sheetsService';

const router = express.Router();
const db = admin.firestore();

// Clear all user data
router.delete('/clear-data', async (req, res) => {
  try {
    const { userId, accessToken } = req.body;
    
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    let driveFilesDeleted = 0;
    let spreadsheetCleared = false;

    // Clear Drive files if access token provided
    if (accessToken) {
      try {
        const driveService = new DriveService(accessToken);
        driveFilesDeleted = await driveService.clearAllInvoiceFiles(userId);
        
        const sheetsService = new SheetsService(accessToken);
        await sheetsService.deleteSpreadsheet(userId);
        spreadsheetCleared = true;
      } catch (driveError) {
        console.error('Error clearing Drive/Sheets data:', driveError);
      }
    }

    // Delete all user's invoices
    const invoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .get();

    const invoiceDeletes = invoicesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(invoiceDeletes);

    // Delete all processing logs
    const logsSnapshot = await db.collection('processing_logs')
      .where('userId', '==', userId)
      .get();

    const logDeletes = logsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(logDeletes);

    // Reset user's last processed timestamp and clear Drive/Sheets IDs
    await db.collection('users').doc(userId).update({
      lastProcessedTimestamp: null,
      driveFolder: null,
      spreadsheetId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'All data cleared successfully',
      deletedInvoices: invoicesSnapshot.docs.length,
      deletedLogs: logsSnapshot.docs.length,
      driveFilesDeleted,
      spreadsheetCleared
    });

  } catch (error) {
    console.error('Error clearing user data:', error);
    res.status(500).json({ error: 'Failed to clear user data' });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    
    // Don't send sensitive data like tokens
    const { accessToken, refreshToken, ...safeUserData } = userData!;
    
    res.json({ user: safeUserData });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user settings
router.put('/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { driveFolder, spreadsheetId } = req.body;
    
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (driveFolder !== undefined) updateData.driveFolder = driveFolder;
    if (spreadsheetId !== undefined) updateData.spreadsheetId = spreadsheetId;
    
    await db.collection('users').doc(userId).update(updateData);
    
    res.json({ success: true, message: 'Settings updated successfully' });

  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Get processing logs
router.get('/logs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const snapshot = await db.collection('processing_logs')
      .where('userId', '==', userId)
      .orderBy('startTime', 'desc')
      .limit(parseInt(limit as string))
      .get();
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ logs });

  } catch (error) {
    console.error('Error fetching processing logs:', error);
    res.status(500).json({ error: 'Failed to fetch processing logs' });
  }
});

export default router; 
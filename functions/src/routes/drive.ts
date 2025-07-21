import express from 'express';
import * as admin from 'firebase-admin';
import { DriveService } from '../services/driveService';

const router = express.Router();
const db = admin.firestore();

// Get user's Drive files
router.get('/files/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.query;
    
    if (!accessToken) {
      res.status(400).json({ error: 'Access token required' });
      return;
    }

    const driveService = new DriveService(accessToken as string);
    const files = await driveService.listInvoiceFiles(userId);
    
    res.json({ files });
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    res.status(500).json({ error: 'Failed to fetch Drive files' });
  }
});

// Get file info
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { accessToken } = req.query;
    
    if (!accessToken) {
      res.status(400).json({ error: 'Access token required' });
      return;
    }

    const driveService = new DriveService(accessToken as string);
    const fileInfo = await driveService.getFileInfo(fileId);
    
    if (!fileInfo) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    res.json({ file: fileInfo });
  } catch (error) {
    console.error('Error fetching file info:', error);
    res.status(500).json({ error: 'Failed to fetch file info' });
  }
});

// Clear all Drive files
router.delete('/clear/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.body;
    
    if (!accessToken) {
      res.status(400).json({ error: 'Access token required' });
      return;
    }

    const driveService = new DriveService(accessToken);
    const deletedCount = await driveService.clearAllInvoiceFiles(userId);
    
    res.json({
      success: true,
      message: 'Drive files cleared successfully',
      deletedCount
    });
  } catch (error) {
    console.error('Error clearing Drive files:', error);
    res.status(500).json({ error: 'Failed to clear Drive files' });
  }
});

export default router; 
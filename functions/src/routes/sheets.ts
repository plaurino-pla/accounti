import express from 'express';
import * as admin from 'firebase-admin';
import { SheetsService } from '../services/sheetsService';

const router = express.Router();
const db = admin.firestore();

// Get spreadsheet URL
router.get('/url/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.query;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const sheetsService = new SheetsService(accessToken as string);
    const url = await sheetsService.getSpreadsheetUrl(userId);
    
    res.json({ url });
  } catch (error) {
    console.error('Error getting spreadsheet URL:', error);
    res.status(500).json({ error: 'Failed to get spreadsheet URL' });
  }
});

// Create or update spreadsheet
router.post('/update/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const sheetsService = new SheetsService(accessToken);
    await sheetsService.updateSpreadsheetWithAllInvoices(userId);
    
    const url = await sheetsService.getSpreadsheetUrl(userId);
    
    res.json({
      success: true,
      message: 'Spreadsheet updated successfully',
      url
    });
  } catch (error) {
    console.error('Error updating spreadsheet:', error);
    res.status(500).json({ error: 'Failed to update spreadsheet' });
  }
});

// Create new spreadsheet
router.post('/create/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    const sheetsService = new SheetsService(accessToken);
    const spreadsheetId = await sheetsService.getOrCreateInvoiceSpreadsheet(userId);
    const url = await sheetsService.getSpreadsheetUrl(userId);
    
    res.json({
      success: true,
      message: 'Spreadsheet created successfully',
      spreadsheetId,
      url
    });
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    res.status(500).json({ error: 'Failed to create spreadsheet' });
  }
});

export default router; 
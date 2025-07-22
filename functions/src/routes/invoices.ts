import express from 'express';
import * as admin from 'firebase-admin';
import multer from 'multer';
import { GmailService } from '../services/gmailService';
import { InvoiceProcessor, ProcessedInvoice } from '../services/invoiceProcessor';
import { SchedulerService } from '../services/scheduler';

const router = express.Router();
const db = admin.firestore();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Manual invoice upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('=== MANUAL UPLOAD ROUTE CALLED ===');
  try {
    const { userId, accessToken } = req.body;
    const file = req.file;
    
    if (!userId || !accessToken) {
      res.status(400).json({ error: 'Missing userId or accessToken' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    console.log('Uploaded file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Initialize services
    const invoiceProcessor = new InvoiceProcessor();

    // Check if it's an invoice first
    let isInvoice = false;
    let extractedData: any = null;
    
    try {
      const invoiceCheck = await invoiceProcessor.isInvoiceAttachment(
        file.originalname, 
        file.buffer
      );
      isInvoice = invoiceCheck.isInvoice;
      
      if (isInvoice) {
        // Extract data for duplicate checking
        extractedData = await invoiceProcessor.processInvoiceWithDocumentAI(file.buffer, file.originalname);
        extractedData.originalFilename = file.originalname;
      }
    } catch (invoiceError) {
      const errorMsg = `Error checking if file is invoice ${file.originalname}: ${invoiceError}`;
      console.error(errorMsg);
      res.status(500).json({ 
        success: false, 
        error: errorMsg,
        invoicesFound: 0,
        emailsScanned: 0,
        attachmentsProcessed: 0
      });
      return;
    }

    if (!isInvoice) {
      console.log(`Skipping non-invoice file: ${file.originalname}`);
      res.json({
        success: true,
        invoicesFound: 0,
        emailsScanned: 0,
        attachmentsProcessed: 1,
        message: 'File uploaded but not identified as an invoice'
      });
      return;
    }

    // Generate unique IDs for manual upload
    const emailId = `manual_${Date.now()}`;
    const attachmentId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Enhanced duplicate check with extracted data
    const duplicateCheck = await invoiceProcessor.checkForDuplicateInvoice(
      userId, 
      emailId, 
      attachmentId,
      extractedData
    );

    if (duplicateCheck.isDuplicate) {
      console.log(`Skipping duplicate invoice: ${duplicateCheck.reason}`);
      res.json({
        success: true,
        invoicesFound: 0,
        emailsScanned: 0,
        attachmentsProcessed: 1,
        message: `File uploaded but duplicate detected: ${duplicateCheck.reason}`
      });
      return;
    }

    // Process and save the new invoice
    try {
      console.log('=== PROCESSING MANUAL UPLOAD ===');
      console.log('Invoice detected, processing:', file.originalname);
      
      await invoiceProcessor.processAndSaveInvoice(
        userId,
        emailId,
        attachmentId,
        file.originalname,
        file.buffer,
        accessToken
      );

      res.json({
        success: true,
        invoicesFound: 1,
        emailsScanned: 0,
        attachmentsProcessed: 1,
        message: 'Invoice uploaded and processed successfully'
      });
    } catch (processError) {
      const errorMsg = `Error processing uploaded invoice ${file.originalname}: ${processError}`;
      console.error(errorMsg);
      res.status(500).json({ 
        success: false, 
        error: errorMsg,
        invoicesFound: 0,
        emailsScanned: 0,
        attachmentsProcessed: 1
      });
    }

  } catch (error) {
    console.error('Manual upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process uploaded file',
      invoicesFound: 0,
      emailsScanned: 0,
      attachmentsProcessed: 0
    });
  }
});

// Scan for new invoices
router.post('/scan', async (req, res) => {
  console.log('=== SCAN ROUTE CALLED ===');
  console.log('Request body:', req.body);
  try {
    const { userId, accessToken } = req.body;
    
    if (!userId || !accessToken) {
      res.status(400).json({ error: 'Missing userId or accessToken' });
      return;
    }

    // Initialize services
    const gmailService = new GmailService(accessToken);
    const invoiceProcessor = new InvoiceProcessor();

    // Get last processed timestamp
    const lastProcessedDate = await gmailService.getLastProcessedTimestamp(userId);
    
    let searchDate: Date;
    
    if (!lastProcessedDate) {
      // First time user - scan last 12 hours
      console.log('First time user detected, scanning last 12 hours');
      searchDate = new Date(Date.now() - 12 * 60 * 60 * 1000);
    } else {
      // Returning user - scan from last processed email onwards
      console.log('Returning user, scanning from last processed email');
      searchDate = lastProcessedDate;
    }
    
    console.log('Searching for emails after:', searchDate.toISOString());
    
    // Get emails with attachments from the search date
    const emails = await gmailService.getEmailsWithAttachments(searchDate);
    
    console.log(`Processing ${emails.length} emails with attachments`);
    
    let invoicesFound = 0;
    let attachmentsProcessed = 0;
    const errors: string[] = [];
    const latestEmailDate = new Date(0);
    
    // Add timeout protection - stop processing after 8 minutes to avoid function timeout
    const startTime = Date.now();
    const maxProcessingTime = 8 * 60 * 1000; // 8 minutes

    // Process each email
    for (const email of emails) {
      // Check if we're approaching the timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > maxProcessingTime) {
        console.log(`Timeout protection: Stopping processing after ${elapsedTime}ms`);
        break;
      }
      
      try {
        const emailDate = new Date(parseInt(email.internalDate));
        if (emailDate > latestEmailDate) {
          latestEmailDate.setTime(emailDate.getTime());
        }

        // Process each attachment
        for (const attachment of email.attachments || []) {
          try {
            attachmentsProcessed++;

            // Download attachment first to check if it's an invoice
            let buffer: Buffer;
            try {
              buffer = await gmailService.downloadAttachment(email.id, attachment.attachmentId);
              console.log(`Downloaded attachment: ${attachment.filename}, size: ${buffer.length} bytes`);
            } catch (downloadError) {
              const errorMsg = `Error downloading attachment ${attachment.filename}: ${downloadError}`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue; // Skip this attachment
            }

            // Check if it's an invoice first
            let isInvoice = false;
            let extractedData: any = null;
            
            try {
              const invoiceCheck = await invoiceProcessor.isInvoiceAttachment(
                attachment.filename, 
                buffer
              );
              isInvoice = invoiceCheck.isInvoice;
              
              if (isInvoice) {
                // Extract data for duplicate checking
                extractedData = await invoiceProcessor.processInvoiceWithDocumentAI(buffer, attachment.filename);
                extractedData.originalFilename = attachment.filename;
              }
            } catch (invoiceError) {
              const errorMsg = `Error checking if attachment is invoice ${attachment.filename}: ${invoiceError}`;
              console.error(errorMsg);
              errors.push(errorMsg);
              continue;
            }

            if (!isInvoice) {
              console.log(`Skipping non-invoice attachment: ${attachment.filename}`);
              continue;
            }

            // Enhanced duplicate check with extracted data
            const duplicateCheck = await invoiceProcessor.checkForDuplicateInvoice(
              userId, 
              email.id, 
              attachment.attachmentId,
              extractedData
            );

            if (duplicateCheck.isDuplicate) {
              console.log(`Skipping duplicate invoice: ${duplicateCheck.reason}`);
              continue;
            }

            // Process and save the new invoice
            try {
              console.log('=== PROCESSING NEW INVOICE ===');
              console.log('Invoice detected, processing:', attachment.filename);
              
              await invoiceProcessor.processAndSaveInvoice(
                userId,
                email.id,
                attachment.attachmentId,
                attachment.filename,
                buffer,
                accessToken
              );
              invoicesFound++;
            } catch (processError) {
              const errorMsg = `Error processing invoice ${attachment.filename}: ${processError}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }

          } catch (attachmentError) {
            const errorMsg = `Error processing attachment ${attachment.filename}: ${attachmentError}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }

      } catch (emailError) {
        const errorMsg = `Error processing email ${email.id}: ${emailError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Update last processed timestamp
    if (latestEmailDate.getTime() > 0) {
      await gmailService.updateLastProcessedTimestamp(userId, latestEmailDate);
    }

    // Log processing results
    await logProcessingResults(userId, {
      emailsScanned: emails.length,
      attachmentsProcessed,
      invoicesFound,
      errors,
      startTime: new Date(),
      endTime: new Date(),
      triggerType: 'manual'
    });

    res.json({
      success: true,
      emailsScanned: emails.length,
      attachmentsProcessed,
      invoicesFound,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Invoice scan error:', error);
    res.status(500).json({ error: 'Failed to scan for invoices' });
  }
});

// Get user's invoices
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const snapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .get();

    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ invoices });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .get();

    const invoices = snapshot.docs.map(doc => doc.data());
    
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
    
    const vendorBreakdown = invoices.reduce((acc, inv) => {
      const vendor = inv.vendorName || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + (inv.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalInvoices,
      totalAmount,
      averageAmount,
      vendorBreakdown
    });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Failed to fetch invoice statistics' });
  }
});

// Log processing results
async function logProcessingResults(userId: string, results: {
  emailsScanned: number;
  attachmentsProcessed: number;
  invoicesFound: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  triggerType: 'manual' | 'scheduled';
}) {
  try {
    await db.collection('processing_logs').add({
      userId,
      ...results,
      createdAt: admin.firestore.Timestamp.now()
    });
  } catch (error) {
    console.error('Error logging processing results:', error);
  }
}

// Manual trigger for scheduled processing (for testing)
router.post('/trigger-scheduled', async (req, res) => {
  try {
    const { userId, accessToken } = req.body;
    
    if (!userId || !accessToken) {
      res.status(400).json({ error: 'Missing userId or accessToken' });
      return;
    }

    console.log(`Manual trigger of scheduled processing for user: ${userId}`);
    
    const schedulerService = new SchedulerService();
    const result = await schedulerService.processUserInvoices(userId, accessToken);
    
    res.json({
      success: true,
      message: 'Scheduled processing completed',
      result
    });

  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger scheduled processing' });
  }
});

export default router; 
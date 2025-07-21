import express from 'express';
import * as admin from 'firebase-admin';
import { GmailService } from '../services/gmailService';
import { InvoiceProcessor, ProcessedInvoice } from '../services/invoiceProcessor';

const router = express.Router();
const db = admin.firestore();

// Scan for new invoices
router.post('/scan', async (req, res) => {
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
    
    // Only look for emails from the last 12 hours to avoid timeouts
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const searchDate = lastProcessedDate && lastProcessedDate > twelveHoursAgo ? lastProcessedDate : twelveHoursAgo;
    
    // Get emails with attachments from the last 12 hours
    const emails = await gmailService.getEmailsWithAttachments(searchDate);
    
    let invoicesFound = 0;
    let attachmentsProcessed = 0;
    const errors: string[] = [];
    const latestEmailDate = new Date(0);

    // Process each email
    for (const email of emails) {
      try {
        const emailDate = new Date(parseInt(email.internalDate));
        if (emailDate > latestEmailDate) {
          latestEmailDate.setTime(emailDate.getTime());
        }

        // Process each attachment
        for (const attachment of email.attachments || []) {
          try {
            attachmentsProcessed++;

            // Check if already processed
            const isDuplicate = await invoiceProcessor.checkForDuplicateInvoice(
              userId, 
              email.id, 
              attachment.attachmentId
            );

            if (isDuplicate) {
              continue;
            }

            // Download attachment
            const buffer = await gmailService.downloadAttachment(email.id, attachment.attachmentId);

            // Check if it's an invoice
            try {
              const { isInvoice, confidence } = await invoiceProcessor.isInvoiceAttachment(
                attachment.filename, 
                buffer
              );

              if (isInvoice) {
                // Process and save invoice with Drive and Sheets integration
                await invoiceProcessor.processAndSaveInvoice(
                  userId,
                  email.id,
                  attachment.attachmentId,
                  attachment.filename,
                  buffer,
                  accessToken
                );
                invoicesFound++;
              }
            } catch (invoiceError) {
              const errorMsg = `Error processing invoice ${attachment.filename}: ${invoiceError}`;
              console.error(errorMsg);
              errors.push(errorMsg);
              // Continue with other attachments
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

export default router; 
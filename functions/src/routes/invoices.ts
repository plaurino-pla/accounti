import express from 'express';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import { GmailService } from '../services/gmailService';
import { InvoiceProcessor, ProcessedInvoice } from '../services/invoiceProcessor';
import { SchedulerService } from '../services/scheduler';

const router = express.Router();
const db = admin.firestore();

// Manual invoice upload endpoint with base64 support
router.post('/upload', async (req, res) => {
  console.log('=== MANUAL UPLOAD ROUTE CALLED ===');
  console.log('Request body keys:', Object.keys(req.body));
  
  try {
    const { userId, accessToken, filename, fileContent, fileSize } = req.body;
    
    if (!userId || !accessToken) {
      console.error('Missing userId or accessToken');
      res.status(400).json({ error: 'Missing userId or accessToken' });
      return;
    }

    if (!filename || !fileContent) {
      console.error('Missing filename or fileContent');
      res.status(400).json({ error: 'Missing filename or fileContent' });
      return;
    }

    // Validate file size (10MB limit)
    if (fileSize > 10 * 1024 * 1024) {
      console.error('File too large:', fileSize);
      res.status(400).json({ error: 'File size exceeds 10MB limit' });
      return;
    }

    // Convert base64 to buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(fileContent, 'base64');
      console.log('Converted base64 to buffer, size:', buffer.length);
    } catch (error) {
      console.error('Error converting base64 to buffer:', error);
      res.status(400).json({ error: 'Invalid file content' });
      return;
    }

    console.log('Processing file:', {
      filename,
      size: buffer.length,
      originalSize: fileSize
    });

    // Initialize services
    const invoiceProcessor = new InvoiceProcessor();

    // Check if it's an invoice first
    let isInvoice = false;
    let extractedData: any = null;
    
    try {
      const invoiceCheck = await invoiceProcessor.isInvoiceAttachment(
        filename, 
        buffer
      );
      isInvoice = invoiceCheck.isInvoice;
      
      if (isInvoice) {
        // Extract data for duplicate checking
        extractedData = await invoiceProcessor.processInvoiceWithDocumentAI(buffer, filename);
        extractedData.originalFilename = filename;
      }
    } catch (invoiceError) {
      const errorMsg = `Error checking if file is invoice ${filename}: ${invoiceError}`;
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
      console.log(`Skipping non-invoice file: ${filename}`);
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
      console.log('Invoice detected, processing:', filename);
      
      await invoiceProcessor.processAndSaveInvoice(
        userId,
        emailId,
        attachmentId,
        filename,
        buffer,
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
      const errorMsg = `Error processing uploaded invoice ${filename}: ${processError}`;
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

    // Get user's last processed timestamp and first-time status
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const lastProcessed = userData?.lastProcessedTimestamp;
    
    // Check if user has any existing invoices
    const existingInvoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    const hasExistingInvoices = !existingInvoicesSnapshot.empty;
    const isFirstTime = !hasExistingInvoices;
    
    console.log(`User ${userId} - First time: ${isFirstTime}, Has existing invoices: ${hasExistingInvoices}, Last processed: ${lastProcessed ? lastProcessed.toDate().toISOString() : 'Never'}`);

    // Calculate time range
    let timeRange: Date;
    if (isFirstTime) {
      // First time: scan last 30 days
      timeRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      console.log('First-time user: scanning last 30 days');
    } else {
      // Regular: scan since last processed (with some overlap)
      if (lastProcessed) {
        timeRange = new Date(lastProcessed.toDate().getTime() - 12 * 60 * 60 * 1000);
        console.log('Regular user: scanning since last processed');
      } else {
        // No last processed timestamp, scan last 24 hours
        timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log('Regular user: no last processed timestamp, scanning last 24 hours');
      }
    }
    
    console.log('Searching for emails after:', timeRange.toISOString());
    
    // For first-time users, start background processing and return immediately
    if (isFirstTime) {
      console.log('Starting background processing for first-time user');
      
      // Start background processing (fire and forget)
      processFirstTimeScanInBackground(userId, accessToken, timeRange).catch(error => {
        console.error('Background processing error:', error);
      });
      
      // Update user to mark as not first-time anymore
      await db.collection('users').doc(userId).update({
        lastProcessedTimestamp: new Date(),
        firstTimeProcessing: true
      });

      res.json({
        success: true,
        message: 'First-time scan started in background. This may take a few minutes to complete.',
        emailsScanned: 0,
        attachmentsProcessed: 0,
        invoicesFound: 0,
        isFirstTime: true
      });
      return;
    }

    // Regular processing - also run in background to avoid timeouts
    console.log('Starting background processing for regular user');
    
    // Start background processing (fire and forget)
    processRegularScanInBackground(userId, accessToken, timeRange).catch(error => {
      console.error('Background processing error:', error);
    });
    
    // Update user to mark as processing
    await db.collection('users').doc(userId).update({
      lastProcessedTimestamp: new Date(),
      regularProcessing: true
    });

    res.json({
      success: true,
      message: 'Scan started in background. This may take a few minutes to complete.',
      emailsScanned: 0,
      attachmentsProcessed: 0,
      invoicesFound: 0,
      isFirstTime: false
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

    const invoices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings for frontend
        issueDate: data.issueDate ? data.issueDate.toDate().toISOString() : undefined,
        dueDate: data.dueDate ? data.dueDate.toDate().toISOString() : undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : undefined
      };
    });

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

// Background processing for first-time users (30 days)
async function processFirstTimeScanInBackground(userId: string, accessToken: string, timeRange: Date) {
  try {
    console.log(`=== BACKGROUND FIRST-TIME PROCESSING FOR USER ${userId} ===`);
    console.log(`Scanning emails from: ${timeRange.toISOString()} to now`);
    
    const gmailService = new GmailService(accessToken);
    const invoiceProcessor = new InvoiceProcessor();

    // Fetch emails with attachments for the last 30 days
    const emails = await gmailService.getEmailsWithAttachments(timeRange);
    console.log(`Found ${emails.length} emails with attachments for first-time processing`);
    console.log(`Time range: ${timeRange.toISOString()} to ${new Date().toISOString()}`);
    
    // Debug: Log email details
    emails.forEach((email, index) => {
      console.log(`Email ${index + 1}: ID=${email.id}, Attachments=${email.attachments?.length || 0}`);
    });

    let totalInvoicesFound = 0;
    let totalEmailsScanned = 0;
    let totalAttachmentsProcessed = 0;
    const errors: string[] = [];
    const startTime = new Date();

    // Process emails in chunks to avoid timeouts
    const chunkSize = 5; // Smaller chunks for better reliability
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(emails.length/chunkSize)}`);
      
      for (const email of chunk) {
        try {
          totalEmailsScanned++;
          console.log(`Processing email ${totalEmailsScanned}/${emails.length}: ID=${email.id}, Attachments=${email.attachments?.length || 0}`);
          
          // Process each attachment
          for (const attachment of email.attachments || []) {
            try {
              totalAttachmentsProcessed++;

              // Download attachment
              let buffer: Buffer;
              try {
                buffer = await gmailService.downloadAttachment(email.id, attachment.attachmentId);
                console.log(`Downloaded attachment: ${attachment.filename}, size: ${buffer.length} bytes`);
              } catch (downloadError) {
                const errorMsg = `Error downloading attachment ${attachment.filename}: ${downloadError}`;
                console.error(errorMsg);
                errors.push(errorMsg);
                continue;
              }

              // Check if it's an invoice
              let isInvoice = false;
              let extractedData: any = null;
              
              try {
                const invoiceCheck = await invoiceProcessor.isInvoiceAttachment(
                  attachment.filename, 
                  buffer
                );
                isInvoice = invoiceCheck.isInvoice;
                
                if (isInvoice) {
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

              // Check for duplicates
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

              // Process and save the invoice
              try {
                await invoiceProcessor.processAndSaveInvoice(
                  userId,
                  email.id,
                  attachment.attachmentId,
                  attachment.filename,
                  buffer,
                  accessToken
                );

                totalInvoicesFound++;
                console.log(`Successfully processed invoice: ${attachment.filename}`);
                
                // Send notification for each invoice found
                await sendInvoiceNotification(userId, 1);

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

      // Small delay between chunks to avoid rate limiting
      if (i + chunkSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update user's processing status
    await db.collection('users').doc(userId).update({
      firstTimeProcessing: false,
      lastProcessedTimestamp: new Date()
    });

    // Log processing results
    await logProcessingResults(userId, {
      emailsScanned: totalEmailsScanned,
      attachmentsProcessed: totalAttachmentsProcessed,
      invoicesFound: totalInvoicesFound,
      errors,
      startTime,
      endTime: new Date(),
      triggerType: 'manual'
    });

    console.log(`=== FIRST-TIME PROCESSING COMPLETE ===`);
    console.log(`Emails scanned: ${totalEmailsScanned}/${emails.length}`);
    console.log(`Attachments processed: ${totalAttachmentsProcessed}`);
    console.log(`Invoices found: ${totalInvoicesFound}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Processing time: ${Date.now() - startTime.getTime()}ms`);

    // Send completion notification
    if (totalInvoicesFound > 0) {
      await sendFirstTimeCompletionNotification(userId, totalInvoicesFound, totalEmailsScanned);
    }

  } catch (error) {
    console.error('Error in background first-time processing:', error);
    
    // Update user's processing status even on error
    await db.collection('users').doc(userId).update({
      firstTimeProcessing: false,
      lastProcessedTimestamp: new Date()
    });
  }
}

// Send notification email when new invoice is found
async function sendInvoiceNotification(userId: string, invoiceCount: number) {
  try {
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.email) {
      console.log('No email found for user:', userId);
      return;
    }

    // Create Gmail API client (using service account or app-level credentials)
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ 
      access_token: process.env.GMAIL_SERVICE_ACCESS_TOKEN 
    });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const subject = invoiceCount === 1 
      ? 'New Invoice Found - Accounti' 
      : `${invoiceCount} New Invoices Found - Accounti`;

    const message = `
      Hi ${userData.name || 'there'},

      Great news! We found ${invoiceCount === 1 ? 'a new invoice' : `${invoiceCount} new invoices`} in your Gmail.

      ${invoiceCount === 1 ? 'The invoice has been' : 'These invoices have been'} automatically processed and added to your account.

      You can view ${invoiceCount === 1 ? 'it' : 'them'} in your dashboard: https://accounti-4698b.web.app

      Best regards,
      The Accounti Team
    `;

    // Create email
    const email = [
      `From: Accounti <noreply@accounti.com>`,
      `To: ${userData.email}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      message
    ].join('\r\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log(`Notification email sent to ${userData.email}`);

  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

// Send notification for first-time completion
async function sendFirstTimeCompletionNotification(userId: string, invoiceCount: number, emailCount: number) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.email) {
      console.log('No email found for user:', userId);
      return;
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ 
      access_token: process.env.GMAIL_SERVICE_ACCESS_TOKEN 
    });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const subject = 'Welcome to Accounti - Your First Scan is Complete!';

    const message = `
      Hi ${userData.name || 'there'},

      Welcome to Accounti! Your first scan is now complete.

      We scanned ${emailCount} emails from the last 30 days and found ${invoiceCount} invoices.

      All invoices have been automatically processed and added to your account.

      You can view them in your dashboard: https://accounti-4698b.web.app

      From now on, we'll automatically scan for new invoices in real-time!

      Best regards,
      The Accounti Team
    `;

    const email = [
      `From: Accounti <noreply@accounti.com>`,
      `To: ${userData.email}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      message
    ].join('\r\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log(`First-time completion email sent to ${userData.email}`);

  } catch (error) {
    console.error('Error sending first-time completion email:', error);
  }
}

// Process regular scan in background (for existing users)
async function processRegularScanInBackground(userId: string, accessToken: string, timeRange: Date) {
  console.log(`Starting regular background scan for user ${userId}`);
  
  try {
    // Initialize services
    const gmailService = new GmailService(accessToken);
    const invoiceProcessor = new InvoiceProcessor();
    
    // Get emails with attachments
    const emails = await gmailService.getEmailsWithAttachments(timeRange);
    console.log(`Regular scan: Processing ${emails.length} emails with attachments`);
    
    let invoicesFound = 0;
    let attachmentsProcessed = 0;
    const errors: string[] = [];
    const latestEmailDate = new Date(0);
    
    // Process emails in chunks to avoid timeouts
    const chunkSize = 5;
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(emails.length / chunkSize)}`);
      
      for (const email of chunk) {
        try {
          const emailDate = new Date(parseInt(email.internalDate));
          if (emailDate > latestEmailDate) {
            latestEmailDate.setTime(emailDate.getTime());
          }

          // Process email attachments
          const results = await invoiceProcessor.processEmailAttachments(
            userId,
            email.id,
            email,
            accessToken
          );
          
          invoicesFound += results.invoicesFound;
          attachmentsProcessed += results.attachmentsProcessed;
          
        } catch (emailError) {
          const errorMsg = `Error processing email ${email.id}: ${emailError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      // Small delay between chunks to avoid rate limits
      if (i + chunkSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update last processed timestamp
    if (latestEmailDate.getTime() > 0) {
      await db.collection('users').doc(userId).update({
        lastProcessedTimestamp: latestEmailDate,
        regularProcessing: false
      });
    } else {
      await db.collection('users').doc(userId).update({
        regularProcessing: false
      });
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

    // Send notification if invoices were found
    if (invoicesFound > 0) {
      try {
        await sendInvoiceNotification(userId, invoicesFound);
      } catch (notificationError) {
        console.error('Error sending regular scan notification:', notificationError);
      }
    }

    console.log(`Regular background scan completed for user ${userId}: ${invoicesFound} invoices found`);

  } catch (error) {
    console.error(`Error in regular background scan for user ${userId}:`, error);
    
    // Mark processing as complete even on error
    await db.collection('users').doc(userId).update({
      regularProcessing: false
    });
  }
}

export default router; 
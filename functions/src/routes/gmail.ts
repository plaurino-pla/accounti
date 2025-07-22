import express from 'express';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';
import { InvoiceProcessor } from '../services/invoiceProcessor';
import { DriveService } from '../services/driveService';
import { SheetsService } from '../services/sheetsService';

const db = admin.firestore();

const router = express.Router();

// Gmail webhook endpoint for real-time notifications
router.post('/webhook', async (req, res) => {
  try {
    console.log('=== GMAIL WEBHOOK RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    // Verify the webhook is from Gmail
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid or missing authorization header');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];
    // In production, you'd verify this token against your Gmail API credentials
    
    const { historyId, emailAddress } = req.body;
    
    if (!historyId || !emailAddress) {
      console.log('Missing historyId or emailAddress in webhook payload');
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    console.log(`Processing webhook for ${emailAddress}, historyId: ${historyId}`);

    // Get user by email
    const userSnapshot = await db.collection('users')
      .where('email', '==', emailAddress)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      console.log(`User not found for email: ${emailAddress}`);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    if (!userData?.accessToken) {
      console.log(`No access token for user: ${emailAddress}`);
      res.status(400).json({ error: 'No access token' });
      return;
    }

    // Process the new emails in the background
    processNewEmailsInBackground(userId, userData.accessToken, historyId);

    // Respond immediately to Gmail
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing Gmail webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set up Gmail push notifications for a user
router.post('/setup-webhook/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({ error: 'Access token required' });
      return;
    }

    console.log(`Setting up Gmail webhook for user: ${userId}`);

    // Create Gmail API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user's email address
    const userProfile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = userProfile.data.emailAddress;

    if (!emailAddress) {
      res.status(400).json({ error: 'Could not get email address' });
      return;
    }

    // Set up push notifications
    const webhookUrl = `${process.env.FUNCTION_URL}/gmail/webhook`;
    
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
        labelFilterAction: 'include'
      }
    });

    // Store webhook info in user document
    await db.collection('users').doc(userId).update({
      gmailWebhookActive: true,
      gmailHistoryId: watchResponse.data.historyId,
      webhookExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    console.log(`Gmail webhook set up successfully for ${emailAddress}`);
    res.json({ 
      success: true, 
      emailAddress,
      historyId: watchResponse.data.historyId 
    });

  } catch (error) {
    console.error('Error setting up Gmail webhook:', error);
    res.status(500).json({ error: 'Failed to set up webhook' });
  }
});

// Stop Gmail push notifications for a user
router.post('/stop-webhook/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({ error: 'Access token required' });
      return;
    }

    console.log(`Stopping Gmail webhook for user: ${userId}`);

    // Create Gmail API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Stop watching
    await gmail.users.stop({ userId: 'me' });

    // Update user document
    await db.collection('users').doc(userId).update({
      gmailWebhookActive: false,
      gmailHistoryId: null,
      webhookExpiry: null
    });

    console.log(`Gmail webhook stopped successfully for user: ${userId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Error stopping Gmail webhook:', error);
    res.status(500).json({ error: 'Failed to stop webhook' });
  }
});

// Background function to process new emails
async function processNewEmailsInBackground(userId: string, accessToken: string, historyId: string) {
  try {
    console.log(`=== PROCESSING NEW EMAILS FOR USER ${userId} ===`);
    
    // Create Gmail API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user's current history ID
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const lastHistoryId = userData?.gmailHistoryId;

    if (!lastHistoryId) {
      console.log('No previous history ID found, skipping');
      return;
    }

    // Get history of changes
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId,
      historyTypes: ['messageAdded']
    });

    const history = historyResponse.data.history;
    if (!history || history.length === 0) {
      console.log('No new messages in history');
      return;
    }

    console.log(`Found ${history.length} history entries`);

    // Process each new message
    const invoiceProcessor = new InvoiceProcessor();
    let processedCount = 0;
    let invoiceCount = 0;

    for (const historyItem of history) {
      if (!historyItem.messagesAdded) continue;

      for (const messageAdded of historyItem.messagesAdded) {
        const messageId = messageAdded.message?.id;
        if (!messageId) continue;

        try {
          // Get message details
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
          });

          const message = messageResponse.data;
          
          // Check if message has attachments
          const hasAttachments = message.payload?.parts?.some(part => 
            part.filename && part.filename.length > 0
          ) || (message.payload?.filename && message.payload.filename.length > 0);

          if (!hasAttachments) {
            console.log(`Message ${messageId} has no attachments, skipping`);
            continue;
          }

          console.log(`Processing message ${messageId} with attachments`);

          // Process attachments
          const result = await invoiceProcessor.processEmailAttachments(
            userId,
            messageId,
            message,
            accessToken
          );

          processedCount++;
          if (result.invoicesFound > 0) {
            invoiceCount += result.invoicesFound;
            
            // Send notification email for each invoice found
            await sendInvoiceNotification(userId, result.invoicesFound);
          }

        } catch (error) {
          console.error(`Error processing message ${messageId}:`, error);
        }
      }
    }

    // Update user's history ID
    await db.collection('users').doc(userId).update({
      gmailHistoryId: historyId,
      lastProcessedTimestamp: new Date()
    });

    console.log(`=== WEBHOOK PROCESSING COMPLETE ===`);
    console.log(`Processed: ${processedCount} messages`);
    console.log(`Invoices found: ${invoiceCount}`);

  } catch (error) {
    console.error('Error in background email processing:', error);
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

export default router; 
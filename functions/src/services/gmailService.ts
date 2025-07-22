import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: any;
  internalDate: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export class GmailService {
  private gmail: any;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Get emails with attachments after a specific date
  async getEmailsWithAttachments(afterDate?: Date): Promise<EmailMessage[]> {
    try {
      let query = 'has:attachment';
      
      if (afterDate) {
        const dateString = Math.floor(afterDate.getTime() / 1000);
        query += ` after:${dateString}`;
      }

      console.log(`Searching for emails with query: ${query}`);

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50 // Reduced from 100 to 50 for faster processing
      });

      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} emails with attachments`);

      if (messages.length === 0) {
        return [];
      }

      const detailedMessages: EmailMessage[] = [];

      // Get detailed information for each message (limit to first 10 to avoid timeouts)
      const messagesToProcess = messages.slice(0, 10);
      
      for (const message of messagesToProcess) {
        try {
          const detail = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });

          const emailMessage = this.parseEmailMessage(detail.data);
          if (emailMessage.attachments && emailMessage.attachments.length > 0) {
            detailedMessages.push(emailMessage);
          }
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          // Continue with other messages
        }
      }

      console.log(`Successfully processed ${detailedMessages.length} emails with attachments`);
      return detailedMessages;
    } catch (error) {
      console.error('Error fetching emails with attachments:', error);
      throw error;
    }
  }

  // Download attachment
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      const data = response.data.data;
      if (!data) {
        throw new Error('No attachment data found');
      }

      return Buffer.from(data, 'base64');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  // Parse email message structure
  private parseEmailMessage(message: any): EmailMessage {
    const attachments: EmailAttachment[] = [];
    
    const extractAttachments = (part: any) => {
      if (part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename || 'unknown',
          mimeType: part.mimeType || 'application/octet-stream',
          size: parseInt(part.body.size) || 0
        });
      }
      
      if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    };

    if (message.payload) {
      extractAttachments(message.payload);
    }

    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds || [],
      snippet: message.snippet || '',
      payload: message.payload,
      internalDate: message.internalDate,
      attachments: attachments
    };
  }

  // Get user's last processed email timestamp
  async getLastProcessedTimestamp(userId: string): Promise<Date | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.lastProcessedTimestamp) {
        return userData.lastProcessedTimestamp.toDate();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last processed timestamp:', error);
      return null;
    }
  }

  // Update user's last processed timestamp
  async updateLastProcessedTimestamp(userId: string, timestamp: Date): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        lastProcessedTimestamp: admin.firestore.Timestamp.fromDate(timestamp),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last processed timestamp:', error);
      throw error;
    }
  }

  // Check if email is recent (within last 30 days by default)
  isRecentEmail(emailDate: string, daysThreshold: number = 30): boolean {
    const emailTimestamp = parseInt(emailDate);
    const emailDateObj = new Date(emailTimestamp);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    
    return emailDateObj >= thresholdDate;
  }

  // Get email subject and sender
  getEmailMetadata(payload: any): { subject: string; sender: string } {
    const headers = payload.headers || [];
    
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const sender = headers.find((h: any) => h.name === 'From')?.value || '';
    
    return { subject, sender };
  }
} 
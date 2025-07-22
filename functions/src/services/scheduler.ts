import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GmailService } from './gmailService';
import { InvoiceProcessor } from './invoiceProcessor';
import { DriveService } from './driveService';
import { SheetsService } from './sheetsService';

const db = admin.firestore();

export interface ProcessingResult {
  userId: string;
  emailsScanned: number;
  attachmentsProcessed: number;
  invoicesFound: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  triggerType: 'manual' | 'scheduled';
}

export class SchedulerService {
  
  // Process invoices for a specific user
  async processUserInvoices(userId: string, accessToken: string): Promise<ProcessingResult> {
    const startTime = new Date();
    const result: ProcessingResult = {
      userId,
      emailsScanned: 0,
      attachmentsProcessed: 0,
      invoicesFound: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      triggerType: 'scheduled'
    };

    try {
      console.log(`Starting scheduled processing for user: ${userId}`);

      // Create service instances with access token
      const gmailService = new GmailService(accessToken);
      const invoiceProcessor = new InvoiceProcessor();
      const sheetsService = new SheetsService(accessToken);

      // Get user's last processed timestamp
      const lastProcessedDate = await gmailService.getLastProcessedTimestamp(userId);
      
      // Get emails with attachments since last processed
      const emails = await gmailService.getEmailsWithAttachments(lastProcessedDate || undefined);
      result.emailsScanned = emails.length;

      console.log(`Found ${emails.length} emails to process for user ${userId}`);

      for (const email of emails) {
        try {
          // Process each email's attachments
          const emailResult = await this.processEmailAttachments(userId, email, accessToken);
          result.attachmentsProcessed += emailResult.attachmentsProcessed;
          result.invoicesFound += emailResult.invoicesFound;
        } catch (error) {
          const errorMsg = `Error processing email ${email.id}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Update last processed timestamp
      await gmailService.updateLastProcessedTimestamp(userId, new Date());

      // Update spreadsheet with all invoices
      try {
        await sheetsService.updateSpreadsheetWithAllInvoices(userId);
      } catch (error) {
        const errorMsg = `Error updating spreadsheet: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

    } catch (error) {
      const errorMsg = `Scheduled processing failed for user ${userId}: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    result.endTime = new Date();

    // Save processing log
    await this.saveProcessingLog(result);

    console.log(`Scheduled processing completed for user ${userId}:`, {
      emailsScanned: result.emailsScanned,
      invoicesFound: result.invoicesFound,
      errors: result.errors.length
    });

    return result;
  }

  // Process attachments for a specific email
  private async processEmailAttachments(
    userId: string, 
    email: any, 
    accessToken: string
  ): Promise<{ attachmentsProcessed: number; invoicesFound: number }> {
    let attachmentsProcessed = 0;
    let invoicesFound = 0;

    if (!email.payload?.parts) {
      return { attachmentsProcessed, invoicesFound };
    }

    // Create service instances
    const gmailService = new GmailService(accessToken);
    const invoiceProcessor = new InvoiceProcessor();

    for (const part of email.payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        try {
          attachmentsProcessed++;

          // Download attachment
          const buffer = await gmailService.downloadAttachment(email.id, part.body.attachmentId);
          
          // Check if it's an invoice first
          const { isInvoice, confidence } = await invoiceProcessor.isInvoiceAttachment(part.filename, buffer);
          
          if (isInvoice) {
            console.log(`Invoice detected: ${part.filename} (confidence: ${confidence})`);
            
            // Extract data for duplicate checking
            let extractedData: any = null;
            try {
              extractedData = await invoiceProcessor.processInvoiceWithDocumentAI(buffer, part.filename);
              extractedData.originalFilename = part.filename;
            } catch (extractError) {
              console.error(`Error extracting data from ${part.filename}:`, extractError);
              continue;
            }

            // Enhanced duplicate check
            const duplicateCheck = await invoiceProcessor.checkForDuplicateInvoice(
              userId,
              email.id,
              part.body.attachmentId,
              extractedData
            );

            if (duplicateCheck.isDuplicate) {
              console.log(`Skipping duplicate invoice: ${duplicateCheck.reason}`);
              continue;
            }

            // Process and save the new invoice
            console.log(`Processing new invoice: ${part.filename}`);
            await invoiceProcessor.processAndSaveInvoice(
              userId,
              email.id,
              part.body.attachmentId,
              part.filename,
              buffer,
              accessToken
            );
            
            invoicesFound++;
          }
        } catch (error) {
          console.error(`Error processing attachment ${part.filename}:`, error);
        }
      }
    }

    return { attachmentsProcessed, invoicesFound };
  }

  // Save processing log to Firestore
  private async saveProcessingLog(result: ProcessingResult): Promise<void> {
    try {
      const logRef = db.collection('processing_logs').doc();
      await logRef.set({
        ...result,
        startTime: admin.firestore.Timestamp.fromDate(result.startTime),
        endTime: admin.firestore.Timestamp.fromDate(result.endTime),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving processing log:', error);
    }
  }

  // Get all users with valid tokens for scheduled processing
  async getUsersForScheduledProcessing(): Promise<Array<{ userId: string; accessToken: string }>> {
    try {
      const usersSnapshot = await db.collection('users')
        .where('accessToken', '!=', null)
        .get();

      const users: Array<{ userId: string; accessToken: string }> = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.accessToken) {
          users.push({
            userId: doc.id,
            accessToken: userData.accessToken
          });
        }
      }

      return users;
    } catch (error) {
      console.error('Error getting users for scheduled processing:', error);
      return [];
    }
  }
} 
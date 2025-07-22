import * as admin from 'firebase-admin';
import { DriveService } from './driveService';
import { SheetsService, SheetRow } from './sheetsService';
import { GPTVisionService, GPTExtractedData } from './gptVisionService';

const db = admin.firestore();

export interface ProcessedInvoice {
  id: string;
  userId: string;
  emailId: string;
  attachmentId: string;
  
  // Extracted Data
  invoiceNumber?: string;
  vendorName?: string;
  issueDate?: Date;
  dueDate?: Date;
  amount?: number;
  currency?: string;
  taxAmount?: number;
  
  // File Info
  originalFilename: string;
  driveFileId?: string;
  driveLink?: string;
  
  // Processing Info
  confidence: number;
  processed: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export class InvoiceProcessor {
  constructor() {
    console.log('=== GPT-4 VISION ONLY INVOICE PROCESSOR ===');
    console.log('No fallbacks - GPT-4 Vision or nothing');
  }

  // Check if attachment is an invoice using ChatGPT ONLY
  async isInvoiceAttachment(filename: string, buffer: Buffer): Promise<{ isInvoice: boolean; confidence: number }> {
    try {
      console.log('=== CHATGPT INVOICE DETECTION ===');
      console.log('Filename:', filename);
      console.log('Buffer size:', buffer.length, 'bytes');
      
      // Use ChatGPT to detect if it's an invoice
      const gptService = new GPTVisionService();
      
      // Determine if file is image or PDF based on filename extension
      const fileExtension = filename.toLowerCase().split('.').pop();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '');
      
      let gptData;
      if (isImage) {
        console.log('=== DETECTING AS IMAGE ===');
        gptData = await gptService.processInvoiceWithVision(buffer, filename);
      } else {
        console.log('=== DETECTING AS PDF ===');
        gptData = await gptService.processInvoiceWithChatGPT(buffer, filename);
      }
      
      // Use ChatGPT's invoice detection
      const isInvoice = gptData.isInvoice;
      const confidence = gptData.confidence || (isInvoice ? 0.95 : 0.1);
      
      console.log('=== CHATGPT DETECTION RESULT ===');
      console.log('Is Invoice:', isInvoice);
      console.log('Confidence:', confidence);
      console.log('Extracted data:', gptData);
      
      return { isInvoice, confidence };
    } catch (error) {
      console.error('=== CHATGPT DETECTION FAILED ===');
      console.error('Error:', error);
      // If ChatGPT fails, assume it's not an invoice
      return { isInvoice: false, confidence: 0 };
    }
  }

  // Process invoice with ChatGPT ONLY
  async processInvoiceWithDocumentAI(buffer: Buffer, filename: string): Promise<Partial<ProcessedInvoice>> {
    console.log('=== CHATGPT ONLY METHOD CALLED ===');
    console.log('Buffer size:', buffer.length, 'bytes');
    console.log('Filename:', filename);
    
    try {
      // ONLY use ChatGPT - no fallbacks
      console.log('=== INITIALIZING CHATGPT SERVICE ===');
      const gptService = new GPTVisionService();
      console.log('=== CHATGPT SERVICE INITIALIZED ===');
      
      console.log('=== CALLING CHATGPT API ===');
      
      // Determine if file is image or PDF based on filename extension
      const fileExtension = filename.toLowerCase().split('.').pop();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '');
      
      let gptData;
      if (isImage) {
        console.log('=== PROCESSING AS IMAGE ===');
        gptData = await gptService.processInvoiceWithVision(buffer, filename);
      } else {
        console.log('=== PROCESSING AS PDF ===');
        gptData = await gptService.processInvoiceWithChatGPT(buffer, filename);
      }
      
      console.log('=== CHATGPT SUCCESS ===');
      console.log('Extracted data:', gptData);
      
      // Clean the data to avoid Firestore undefined errors
      const cleanData: Partial<ProcessedInvoice> = {};
      
      if (gptData.vendorName) cleanData.vendorName = gptData.vendorName;
      if (gptData.invoiceNumber) cleanData.invoiceNumber = gptData.invoiceNumber;
      if (gptData.issueDate) cleanData.issueDate = new Date(gptData.issueDate);
      if (gptData.dueDate) cleanData.dueDate = new Date(gptData.dueDate);
      if (gptData.amount) cleanData.amount = gptData.amount;
      if (gptData.currency) cleanData.currency = gptData.currency;
      if (gptData.taxAmount) cleanData.taxAmount = gptData.taxAmount;
      cleanData.confidence = gptData.confidence || 0.95;
      
      console.log('Clean data for Firestore:', cleanData);
      return cleanData;
    } catch (error) {
      console.error('=== CHATGPT FAILED - NO FALLBACK ===');
      console.error('Error:', error);
      throw new Error(`ChatGPT processing failed: ${(error as Error).message}`);
    }
  }

  // Save processed invoice to Firestore
  async saveInvoiceToDatabase(invoice: ProcessedInvoice): Promise<void> {
    try {
      // Clean the invoice data to remove undefined values
      const cleanInvoice: any = {
        id: invoice.id,
        userId: invoice.userId,
        emailId: invoice.emailId,
        attachmentId: invoice.attachmentId,
        originalFilename: invoice.originalFilename,
        confidence: invoice.confidence,
        processed: invoice.processed,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      };

      // Only add defined values
      if (invoice.vendorName) cleanInvoice.vendorName = invoice.vendorName;
      if (invoice.invoiceNumber) cleanInvoice.invoiceNumber = invoice.invoiceNumber;
      if (invoice.issueDate) cleanInvoice.issueDate = invoice.issueDate;
      if (invoice.dueDate) cleanInvoice.dueDate = invoice.dueDate;
      if (invoice.amount) cleanInvoice.amount = invoice.amount;
      if (invoice.currency) cleanInvoice.currency = invoice.currency;
      if (invoice.taxAmount) cleanInvoice.taxAmount = invoice.taxAmount;
      if (invoice.driveFileId) cleanInvoice.driveFileId = invoice.driveFileId;
      if (invoice.driveLink) cleanInvoice.driveLink = invoice.driveLink;

      console.log('Saving clean invoice to Firestore:', cleanInvoice);
      await db.collection('invoices').doc(invoice.id).set(cleanInvoice);
    } catch (error) {
      console.error('Error saving invoice to database:', error);
      throw error;
    }
  }

  // Process and save invoice with Drive and Sheets integration
  async processAndSaveInvoice(
    userId: string,
    emailId: string,
    attachmentId: string,
    filename: string,
    buffer: Buffer,
    accessToken: string
  ): Promise<ProcessedInvoice> {
    console.log('=== GPT-4 FLOW CALLED ===');
    console.log('=== PROCESS AND SAVE INVOICE CALLED ===');
    try {
      // Process the invoice with ChatGPT ONLY
      const extractedData = await this.processInvoiceWithDocumentAI(buffer, filename);
      
      // Initialize services
      const driveService = new DriveService(accessToken);
      const sheetsService = new SheetsService(accessToken);

      // Upload to Drive
      const driveFile = await driveService.uploadInvoiceFile(userId, filename, buffer);
      
      // Create invoice record
      const invoice: ProcessedInvoice = {
        id: `${userId}_${emailId}_${attachmentId}`,
        userId,
        emailId,
        attachmentId,
        originalFilename: filename,
        driveFileId: driveFile.id,
        driveLink: driveFile.webViewLink,
        confidence: extractedData.confidence || 0.95,
        processed: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        ...extractedData
      };

      // Save to database
      await this.saveInvoiceToDatabase(invoice);

      // Add to spreadsheet
      const sheetRow: SheetRow = {
        invoiceNumber: invoice.invoiceNumber || '',
        vendorName: invoice.vendorName || '',
        issueDate: invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
        amount: invoice.amount || 0,
        currency: invoice.currency || 'USD',
        driveLink: driveFile.webViewLink,
        processedDate: new Date().toLocaleDateString()
      };

      await sheetsService.addInvoiceRow(userId, sheetRow);

      return invoice;
    } catch (error) {
      console.error('Error processing and saving invoice:', error);
      throw error;
    }
  }

  // Enhanced duplicate detection - checks multiple criteria
  async checkForDuplicateInvoice(
    userId: string, 
    emailId: string, 
    attachmentId: string,
    extractedData?: Partial<ProcessedInvoice>
  ): Promise<{ isDuplicate: boolean; reason?: string; existingInvoice?: any }> {
    try {
      console.log('=== CHECKING FOR DUPLICATES ===');
      console.log('User ID:', userId);
      console.log('Email ID:', emailId);
      console.log('Attachment ID:', attachmentId);
      console.log('Extracted data:', extractedData);

      // 1. Check for exact same email/attachment combination
      const exactMatch = await db.collection('invoices')
        .where('userId', '==', userId)
        .where('emailId', '==', emailId)
        .where('attachmentId', '==', attachmentId)
        .limit(1)
        .get();
      
      if (!exactMatch.empty) {
        console.log('Duplicate found: Same email/attachment combination');
        return { 
          isDuplicate: true, 
          reason: 'Same email and attachment already processed',
          existingInvoice: exactMatch.docs[0].data()
        };
      }

      // 2. If we have extracted data, check for business logic duplicates
      if (extractedData) {
        const { invoiceNumber, vendorName, amount, currency } = extractedData;
        
        // Check for same invoice number and vendor
        if (invoiceNumber && vendorName) {
          const invoiceNumberMatch = await db.collection('invoices')
            .where('userId', '==', userId)
            .where('invoiceNumber', '==', invoiceNumber)
            .where('vendorName', '==', vendorName)
            .limit(1)
            .get();
          
          if (!invoiceNumberMatch.empty) {
            console.log('Duplicate found: Same invoice number and vendor');
            return { 
              isDuplicate: true, 
              reason: `Invoice #${invoiceNumber} from ${vendorName} already exists`,
              existingInvoice: invoiceNumberMatch.docs[0].data()
            };
          }
        }

        // Check for same vendor, amount, and currency (within 30 days)
        if (vendorName && amount && currency) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const amountMatch = await db.collection('invoices')
            .where('userId', '==', userId)
            .where('vendorName', '==', vendorName)
            .where('amount', '==', amount)
            .where('currency', '==', currency)
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(1)
            .get();
          
          if (!amountMatch.empty) {
            console.log('Duplicate found: Same vendor, amount, and currency within 30 days');
            return { 
              isDuplicate: true, 
              reason: `Invoice from ${vendorName} for ${amount} ${currency} already exists`,
              existingInvoice: amountMatch.docs[0].data()
            };
          }
        }

        // Check for same filename (case-insensitive)
        if (extractedData.originalFilename) {
          const filenameMatch = await db.collection('invoices')
            .where('userId', '==', userId)
            .where('originalFilename', '==', extractedData.originalFilename)
            .limit(1)
            .get();
          
          if (!filenameMatch.empty) {
            console.log('Duplicate found: Same filename');
            return { 
              isDuplicate: true, 
              reason: `File "${extractedData.originalFilename}" already processed`,
              existingInvoice: filenameMatch.docs[0].data()
            };
          }
        }
      }

      console.log('No duplicates found');
      return { isDuplicate: false };
      
    } catch (error) {
      console.error('Error checking for duplicate invoice:', error);
      // If there's an error checking for duplicates, assume it's not a duplicate
      return { isDuplicate: false };
    }
  }
} 
import { db } from './firebase';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export interface ProcessedInvoice {
  vendor?: string;
  amount?: number;
  date?: Date;
  invoiceNumber?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  confidence: number;
}

export const processInvoice = async (
  invoiceId: string,
  fileUrl: string,
  userId: string
): Promise<void> => {
  try {
    console.log(`Processing invoice ${invoiceId} for user ${userId}`);

    // Get user's Google tokens
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const googleTokens = userData?.googleTokens;

    if (!googleTokens) {
      throw new Error('Google tokens not found');
    }

    // Set up Google OAuth client
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials(googleTokens);

    // Download file from Google Drive
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const fileId = extractFileIdFromUrl(fileUrl);
    
    if (!fileId) {
      throw new Error('Invalid file URL');
    }

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name,mimeType'
    });

    // Process based on file type
    let processedData: ProcessedInvoice;

    if (fileMetadata.data.mimeType?.includes('pdf')) {
      processedData = await processPDFInvoice(drive, fileId);
    } else if (fileMetadata.data.mimeType?.includes('image')) {
      processedData = await processImageInvoice(drive, fileId);
    } else {
      throw new Error('Unsupported file type');
    }

    // Update invoice with processed data
    await db.collection('invoices').doc(invoiceId).update({
      ...processedData,
      status: 'processed',
      processedAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`Invoice ${invoiceId} processed successfully`);
  } catch (error) {
    console.error(`Error processing invoice ${invoiceId}:`, error);
    
    // Update invoice with error status
    await db.collection('invoices').doc(invoiceId).update({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date()
    });
  }
};

const extractFileIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const processPDFInvoice = async (
  drive: any,
  fileId: string
): Promise<ProcessedInvoice> => {
  // For now, return mock data
  // In production, you would use Google Cloud Vision API or similar OCR service
  return {
    vendor: 'Sample Vendor',
    amount: 1500.00,
    date: new Date(),
    invoiceNumber: 'INV-2024-001',
    confidence: 0.85
  };
};

const processImageInvoice = async (
  drive: any,
  fileId: string
): Promise<ProcessedInvoice> => {
  // For now, return mock data
  // In production, you would use Google Cloud Vision API
  return {
    vendor: 'Sample Vendor',
    amount: 1200.00,
    date: new Date(),
    invoiceNumber: 'INV-2024-002',
    confidence: 0.80
  };
}; 
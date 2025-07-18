"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInvoice = void 0;
const firebase_1 = require("./firebase");
const google_auth_library_1 = require("google-auth-library");
const googleapis_1 = require("googleapis");
const processInvoice = async (invoiceId, fileUrl, userId) => {
    try {
        console.log(`Processing invoice ${invoiceId} for user ${userId}`);
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const googleTokens = userData?.googleTokens;
        if (!googleTokens) {
            throw new Error('Google tokens not found');
        }
        const oauth2Client = new google_auth_library_1.OAuth2Client();
        oauth2Client.setCredentials(googleTokens);
        const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
        const fileId = extractFileIdFromUrl(fileUrl);
        if (!fileId) {
            throw new Error('Invalid file URL');
        }
        const fileMetadata = await drive.files.get({
            fileId,
            fields: 'name,mimeType'
        });
        let processedData;
        if (fileMetadata.data.mimeType?.includes('pdf')) {
            processedData = await processPDFInvoice(drive, fileId);
        }
        else if (fileMetadata.data.mimeType?.includes('image')) {
            processedData = await processImageInvoice(drive, fileId);
        }
        else {
            throw new Error('Unsupported file type');
        }
        await firebase_1.db.collection('invoices').doc(invoiceId).update({
            ...processedData,
            status: 'processed',
            processedAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`Invoice ${invoiceId} processed successfully`);
    }
    catch (error) {
        console.error(`Error processing invoice ${invoiceId}:`, error);
        await firebase_1.db.collection('invoices').doc(invoiceId).update({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date()
        });
    }
};
exports.processInvoice = processInvoice;
const extractFileIdFromUrl = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};
const processPDFInvoice = async (drive, fileId) => {
    return {
        vendor: 'Sample Vendor',
        amount: 1500.00,
        date: new Date(),
        invoiceNumber: 'INV-2024-001',
        confidence: 0.85
    };
};
const processImageInvoice = async (drive, fileId) => {
    return {
        vendor: 'Sample Vendor',
        amount: 1200.00,
        date: new Date(),
        invoiceNumber: 'INV-2024-002',
        confidence: 0.80
    };
};
//# sourceMappingURL=invoiceProcessor.js.map
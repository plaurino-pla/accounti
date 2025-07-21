import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  webContentLink?: string;
  createdTime: string;
}

export class DriveService {
  private drive: any;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // Create or get user's Accounti folder
  async getOrCreateAccountiFolder(userId: string): Promise<string> {
    try {
      // First, try to get existing folder from user data
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.driveFolder) {
        // Verify the folder still exists
        try {
          await this.drive.files.get({ fileId: userData.driveFolder });
          return userData.driveFolder;
        } catch (error) {
          console.log('Stored folder not found, creating new one');
        }
      }

      // Create new Accounti folder
      const folderMetadata = {
        name: 'Accounti Invoices',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Invoice files processed by Accounti'
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id,name,webViewLink'
      });

      const folderId = folder.data.id!;

      // Update user data with new folder ID
      await db.collection('users').doc(userId).update({
        driveFolder: folderId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return folderId;
    } catch (error) {
      console.error('Error creating/getting Accounti folder:', error);
      throw error;
    }
  }

  // Upload invoice file to Drive
  async uploadInvoiceFile(
    userId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string = 'application/pdf'
  ): Promise<DriveFile> {
    try {
      const folderId = await this.getOrCreateAccountiFolder(userId);

      // Create file metadata
      const fileMetadata = {
        name: filename,
        parents: [folderId],
        description: 'Invoice processed by Accounti'
      };

      // Create media with proper stream handling
      const media = {
        mimeType: mimeType,
        body: require('stream').Readable.from(buffer)
      };

      // Upload file
      const file = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime'
      });

      const driveFile: DriveFile = {
        id: file.data.id!,
        name: file.data.name!,
        mimeType: file.data.mimeType!,
        size: parseInt(file.data.size!) || 0,
        webViewLink: file.data.webViewLink!,
        webContentLink: file.data.webContentLink,
        createdTime: file.data.createdTime!
      };

      return driveFile;
    } catch (error) {
      console.error('Error uploading invoice file:', error);
      throw error;
    }
  }

  // Delete file from Drive
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
    } catch (error) {
      console.error('Error deleting file from Drive:', error);
      throw error;
    }
  }

  // List files in user's Accounti folder
  async listInvoiceFiles(userId: string): Promise<DriveFile[]> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData?.driveFolder) {
        return [];
      }

      const response = await this.drive.files.list({
        q: `'${userData.driveFolder}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size,webViewLink,webContentLink,createdTime)',
        orderBy: 'createdTime desc'
      });

      return response.data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime
      })) || [];
    } catch (error) {
      console.error('Error listing invoice files:', error);
      throw error;
    }
  }

  // Clear all files in user's Accounti folder
  async clearAllInvoiceFiles(userId: string): Promise<number> {
    try {
      const files = await this.listInvoiceFiles(userId);
      
      if (files.length === 0) {
        return 0;
      }

      // Delete all files
      const deletePromises = files.map(file => this.deleteFile(file.id));
      await Promise.all(deletePromises);

      return files.length;
    } catch (error) {
      console.error('Error clearing invoice files:', error);
      throw error;
    }
  }

  // Get file info
  async getFileInfo(fileId: string): Promise<DriveFile | null> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime'
      });

      const file = response.data;
      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size!) || 0,
        webViewLink: file.webViewLink!,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime!
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }
} 
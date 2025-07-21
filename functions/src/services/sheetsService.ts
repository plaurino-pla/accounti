import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface SheetRow {
  invoiceNumber: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  driveLink: string;
  processedDate: string;
}

export class SheetsService {
  private sheets: any;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  // Create or get user's invoice spreadsheet
  async getOrCreateInvoiceSpreadsheet(userId: string): Promise<string> {
    try {
      // First, try to get existing spreadsheet from user data
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.spreadsheetId) {
        // Verify the spreadsheet still exists
        try {
          await this.sheets.spreadsheets.get({ spreadsheetId: userData.spreadsheetId });
          return userData.spreadsheetId;
        } catch (error) {
          console.log('Stored spreadsheet not found, creating new one');
        }
      }

      // Create new spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'Accounti Invoices',
            locale: 'en_US'
          },
          sheets: [
            {
              properties: {
                title: 'Invoices',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 8
                }
              }
            }
          ]
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId!;

      // Set up headers
      await this.setupHeaders(spreadsheetId);

      // Update user data with new spreadsheet ID
      await db.collection('users').doc(userId).update({
        spreadsheetId: spreadsheetId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return spreadsheetId;
    } catch (error) {
      console.error('Error creating/getting invoice spreadsheet:', error);
      throw error;
    }
  }

  // Set up spreadsheet headers
  private async setupHeaders(spreadsheetId: string): Promise<void> {
    const headers = [
      'Invoice Number',
      'Vendor Name',
      'Issue Date',
      'Due Date',
      'Amount',
      'Currency',
      'Drive Link',
      'Processed Date'
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });

    // Format headers
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 8
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.6,
                    blue: 0.9
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1
                    }
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 8
              }
            }
          }
        ]
      }
    });
  }

  // Add invoice row to spreadsheet
  async addInvoiceRow(userId: string, invoice: SheetRow): Promise<void> {
    try {
      const spreadsheetId = await this.getOrCreateInvoiceSpreadsheet(userId);

      // Get the actual sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId,
        ranges: ['A1']
      });

      const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId;
      if (!sheetId) {
        throw new Error('Could not get sheet ID from spreadsheet');
      }

      // Find the next empty row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'A:A'
      });

      const nextRow = (response.data.values?.length || 1) + 1;

      // Add the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `A${nextRow}:H${nextRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            invoice.invoiceNumber,
            invoice.vendorName,
            invoice.issueDate,
            invoice.dueDate,
            invoice.amount,
            invoice.currency,
            `=HYPERLINK("${invoice.driveLink}","View File")`,
            invoice.processedDate
          ]]
        }
      });

      // Note: Removed cell formatting to avoid sheet ID issues
      // The data is added successfully, formatting can be done manually in Google Sheets
    } catch (error) {
      console.error('Error adding invoice row:', error);
      throw error;
    }
  }

  // Update entire spreadsheet with all invoices
  async updateSpreadsheetWithAllInvoices(userId: string): Promise<void> {
    try {
      const spreadsheetId = await this.getOrCreateInvoiceSpreadsheet(userId);

      // Get all invoices from Firestore
      const snapshot = await db.collection('invoices')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const invoices = snapshot.docs.map(doc => doc.data());

      if (invoices.length === 0) {
        return;
      }

      // Prepare data for spreadsheet
      const rows = invoices.map(invoice => [
        invoice.invoiceNumber || '',
        invoice.vendorName || '',
        invoice.issueDate ? new Date(invoice.issueDate.toDate()).toLocaleDateString() : '',
        invoice.dueDate ? new Date(invoice.dueDate.toDate()).toLocaleDateString() : '',
        invoice.amount || 0,
        invoice.currency || 'USD',
        invoice.driveLink ? `=HYPERLINK("${invoice.driveLink}","View File")` : '',
        invoice.createdAt ? new Date(invoice.createdAt.toDate()).toLocaleDateString() : ''
      ]);

      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'A2:H'
      });

      // Add all rows
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `A2:H${rows.length + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rows
          }
        });
      }

      // Format amount column
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 1,
                  endRowIndex: rows.length + 1,
                  startColumnIndex: 4,
                  endColumnIndex: 5
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'CURRENCY',
                      pattern: '#,##0.00'
                    }
                  }
                },
                fields: 'userEnteredFormat.numberFormat'
              }
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error updating spreadsheet with all invoices:', error);
      throw error;
    }
  }

  // Get spreadsheet URL
  async getSpreadsheetUrl(userId: string): Promise<string | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData?.spreadsheetId) {
        return null;
      }

      return `https://docs.google.com/spreadsheets/d/${userData.spreadsheetId}`;
    } catch (error) {
      console.error('Error getting spreadsheet URL:', error);
      return null;
    }
  }

  // Delete spreadsheet
  async deleteSpreadsheet(userId: string): Promise<void> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.spreadsheetId) {
        // Note: We can't actually delete the spreadsheet via API
        // The user will need to delete it manually from their Drive
        console.log(`Spreadsheet ${userData.spreadsheetId} should be deleted manually`);
      }
    } catch (error) {
      console.error('Error handling spreadsheet deletion:', error);
    }
  }
} 
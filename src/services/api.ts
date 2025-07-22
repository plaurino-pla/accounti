import axios from 'axios';

const API_BASE_URL = 'https://us-central1-accounti-4698b.cloudfunctions.net/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout for Gmail scanning operations
});

// Request interceptor to add auth headers
api.interceptors.request.use((config) => {
  // Add any global headers here if needed
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  url: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken?: string;
  driveFolder?: string;
  spreadsheetId?: string;
  lastProcessedTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  emailId: string;
  attachmentId: string;
  invoiceNumber?: string;
  vendorName?: string;
  issueDate?: Date;
  dueDate?: Date;
  amount?: number;
  currency?: string;
  taxAmount?: number;
  originalFilename: string;
  driveFileId?: string;
  driveLink?: string;
  confidence: number;
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  averageAmount: number;
  vendorBreakdown: Record<string, number>;
}

export interface ScanResult {
  success: boolean;
  emailsScanned: number;
  attachmentsProcessed: number;
  invoicesFound: number;
  errors?: string[];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  webContentLink?: string;
  createdTime: string;
}

export interface ProcessingLog {
  id: string;
  userId: string;
  emailsScanned: number;
  attachmentsProcessed: number;
  invoicesFound: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  triggerType: 'manual' | 'scheduled';
}

// Auth API
export const authAPI = {
  getAuthUrl: () => api.get<AuthResponse>('/auth/url'),
  refreshToken: (userId: string) => api.post('/auth/refresh', { userId }),
  validateToken: (accessToken: string) => api.post('/auth/validate', { accessToken }),
};

// Invoice API
export const invoiceAPI = {
  scanInvoices: (userId: string, accessToken: string) =>
    api.post<ScanResult>('/invoices/scan', { userId, accessToken }),
  
  triggerScheduledProcessing: (userId: string, accessToken: string) =>
    api.post<{ success: boolean; message: string; result: ProcessingLog }>('/invoices/trigger-scheduled', { userId, accessToken }),
  
  getUserInvoices: (userId: string, limit = 50, offset = 0) =>
    api.get<{ invoices: Invoice[] }>(`/invoices/${userId}`, {
      params: { limit, offset }
    }),
  
  getInvoiceStats: (userId: string) =>
    api.get<InvoiceStats>(`/invoices/${userId}/stats`),
  
  uploadManualInvoice: (uploadData: {
    userId: string;
    accessToken: string;
    filename: string;
    fileContent: string;
    fileSize: number;
  }) =>
    api.post<ScanResult>('/invoices/upload', uploadData),
};

// Drive API
export const driveAPI = {
  getFiles: (userId: string, accessToken: string) =>
    api.get<{ files: DriveFile[] }>(`/drive/files/${userId}`, {
      params: { accessToken }
    }),
  
  getFileInfo: (fileId: string, accessToken: string) =>
    api.get<{ file: DriveFile }>(`/drive/file/${fileId}`, {
      params: { accessToken }
    }),
  
  clearFiles: (userId: string, accessToken: string) =>
    api.delete<{ success: boolean; deletedCount: number }>(`/drive/clear/${userId}`, {
      data: { accessToken }
    }),
};

// Sheets API
export const sheetsAPI = {
  getSpreadsheetUrl: (userId: string, accessToken: string) =>
    api.get<{ url: string | null }>(`/sheets/url/${userId}`, {
      params: { accessToken }
    }),
  
  updateSpreadsheet: (userId: string, accessToken: string) =>
    api.post<{ success: boolean; url: string }>(`/sheets/update/${userId}`, {
      accessToken
    }),
  
  createSpreadsheet: (userId: string, accessToken: string) =>
    api.post<{ success: boolean; spreadsheetId: string; url: string }>(`/sheets/create/${userId}`, {
      accessToken
    }),
};

// Account API
export const accountAPI = {
  clearAllData: (userId: string, accessToken: string) =>
    api.delete<{
      success: boolean;
      deletedInvoices: number;
      deletedLogs: number;
      driveFilesDeleted: number;
      spreadsheetCleared: boolean;
    }>('/account/clear-data', {
      data: { userId, accessToken }
    }),
  
  getUserProfile: (userId: string) =>
    api.get<{ user: User }>(`/account/profile/${userId}`),
  
  updateSettings: (userId: string, settings: { driveFolder?: string; spreadsheetId?: string }) =>
    api.put<{ success: boolean }>(`/account/settings/${userId}`, settings),
  
  getProcessingLogs: (userId: string, limit = 20) =>
    api.get<{ logs: ProcessingLog[] }>(`/account/logs/${userId}`, {
      params: { limit }
    }),
};

// Admin API
export const adminAPI = {
  getStats: () =>
    api.get<{
      totalUsers: number;
      activeUsers: number;
      totalInvoices: number;
      totalAmount: number;
      averageInvoicesPerUser: number;
      averageAmountPerUser: number;
    }>('/admin/stats'),
  
  getAllUsers: () =>
    api.get<{ users: Array<{
      uid: string;
      email: string;
      name: string;
      picture: string;
      createdAt: Date;
      lastProcessedTimestamp?: Date;
      invoiceCount: number;
      totalAmount: number;
    }> }>('/admin/users'),
  
  getProcessingLogs: (limit = 50) =>
    api.get<{ logs: Array<{
      id: string;
      userId: string;
      userEmail: string;
      emailsScanned: number;
      attachmentsProcessed: number;
      invoicesFound: number;
      errors: string[];
      startTime: Date;
      endTime: Date;
      triggerType: 'manual' | 'scheduled';
    }> }>('/admin/logs', {
      params: { limit }
    }),
  
  getUserForImpersonation: (userId: string) =>
    api.get<{ user: User }>(`/admin/user/${userId}`),
};

// Health check
export const healthAPI = {
  check: () => api.get<{ status: string; timestamp: string }>('/health'),
};

export default api; 
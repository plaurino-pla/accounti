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
  createdAt: Date;
  updatedAt: Date;
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

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  averageAmount: number;
  lastScan?: Date;
  vendorBreakdown: Record<string, number>;
} 
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async getGoogleAuthUrl(): Promise<{ authUrl: string }> {
    return this.request<{ authUrl: string }>('/auth/google/url');
  }

  async connectGmail(userId: string): Promise<{ success: boolean; gmailConnected: boolean }> {
    return this.request<{ success: boolean; gmailConnected: boolean }>('/auth/connect/gmail', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async connectDrive(userId: string): Promise<{ success: boolean; driveConnected: boolean }> {
    return this.request<{ success: boolean; driveConnected: boolean }>('/auth/connect/drive', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async completeOnboarding(userId: string): Promise<{ success: boolean; onboardingCompleted: boolean }> {
    return this.request<{ success: boolean; onboardingCompleted: boolean }>('/auth/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getUserProfile(userId: string): Promise<any> {
    return this.request<any>(`/auth/profile?userId=${userId}`);
  }

  async signOut(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/signout', {
      method: 'POST',
    });
  }

  // Invoice endpoints
  async scanGmail(userId: string, accessToken?: string): Promise<{
    success: boolean;
    invoices: any[];
    totalFound: number;
  }> {
    return this.request<{
      success: boolean;
      invoices: any[];
      totalFound: number;
    }>('/invoices/scan-gmail', {
      method: 'POST',
      body: JSON.stringify({ userId, accessToken }),
    });
  }

  async createSpreadsheet(userId: string, invoices: any[], accessToken?: string): Promise<{
    success: boolean;
    spreadsheetId: string;
    spreadsheetUrl: string;
    rowsAdded: number;
  }> {
    return this.request<{
      success: boolean;
      spreadsheetId: string;
      spreadsheetUrl: string;
      rowsAdded: number;
    }>('/invoices/create-spreadsheet', {
      method: 'POST',
      body: JSON.stringify({ userId, invoices, accessToken }),
    });
  }

  async getInvoices(userId: string): Promise<any[]> {
    return this.request<any[]>(`/invoices?userId=${userId}`);
  }

  async getInvoiceStats(userId: string): Promise<any> {
    return this.request<any>(`/invoices/stats?userId=${userId}`);
  }

  async getInvoice(id: string, userId: string): Promise<any> {
    return this.request<any>(`/invoices/${id}?userId=${userId}`);
  }

  async updateInvoice(id: string, userId: string, updates: any): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/invoices/${id}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteInvoice(id: string, userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/invoices/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService(); 
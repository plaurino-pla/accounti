import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Invoice, InvoiceStats, ProcessingLog, invoiceAPI, accountAPI, sheetsAPI, driveAPI, authAPI } from '../services/api';
import InvoiceTable from './InvoiceTable';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalAmount: 0,
    averageAmount: 0,
    vendorBreakdown: {}
  });
  const [loading, setLoading] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
    loadStats();
    loadSpreadsheetUrl();
  }, [user.uid]);

  const loadInvoices = async () => {
    try {
      const response = await invoiceAPI.getUserInvoices(user.uid);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await invoiceAPI.getInvoiceStats(user.uid);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadSpreadsheetUrl = async () => {
    try {
      const response = await sheetsAPI.getSpreadsheetUrl(user.uid, user.accessToken);
      setSpreadsheetUrl(response.data.url);
    } catch (error) {
      console.error('Failed to load spreadsheet URL:', error);
    }
  };

  const handleFetchInvoices = async () => {
    setLoading(true);
    try {
      let currentAccessToken = user.accessToken;
      
      if (user.refreshToken) {
        try {
          const refreshResponse = await authAPI.refreshToken(user.uid);
          currentAccessToken = refreshResponse.data.accessToken;
          const updatedUser = { ...user, accessToken: currentAccessToken };
          localStorage.setItem('accounti_user', JSON.stringify(updatedUser));
        } catch (refreshError) {
          console.log('Token refresh failed, proceeding with current token');
        }
      }

      const response = await invoiceAPI.scanInvoices(user.uid, currentAccessToken);
      
      if (response.data.success) {
        await loadInvoices();
        await loadStats();
        await loadSpreadsheetUrl();
        
        const message = `Found ${response.data.invoicesFound} new invoices from ${response.data.emailsScanned} emails.`;
        if (response.data.errors && response.data.errors.length > 0) {
          alert(`${message}\n\nSome errors occurred:\n${response.data.errors.slice(0, 3).join('\n')}`);
        } else {
          alert(message);
        }
      } else {
        throw new Error('Scan failed');
      }
    } catch (error: any) {
      console.error('Scan invoices error:', error);
      
      if (error.response?.status === 401) {
        alert('Your session has expired. Please sign in again.');
        localStorage.removeItem('accounti_user');
        window.location.reload();
      } else {
        alert(`Failed to scan for new invoices. Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Accounti
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Main Action Button */}
              <button
                onClick={handleFetchInvoices}
                disabled={loading}
                className="relative group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Fetch New Invoices</span>
                  </div>
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full ring-2 ring-white/50" />
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </div>
                
                <button
                  onClick={signOut}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-white/60"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600">
            Your AI-powered invoice management dashboard
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalInvoices}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Amount</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.averageAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>View Spreadsheet</span>
              </a>
            )}
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">AI Invoice Scanner</h4>
                <p className="text-sm text-gray-600">
                  Scan your Gmail for new invoices using ChatGPT AI
                </p>
              </div>
              <button
                onClick={handleFetchInvoices}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
          </div>
          <InvoiceTable invoices={invoices} />
        </div>

        {/* Empty State */}
        {invoices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
            <p className="text-gray-600 mb-6">
              Click "Fetch New Invoices" to scan your Gmail for invoices
            </p>
            <button
              onClick={handleFetchInvoices}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {loading ? 'Scanning...' : 'Fetch New Invoices'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 
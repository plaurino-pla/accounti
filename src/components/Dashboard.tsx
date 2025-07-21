import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Invoice, InvoiceStats, invoiceAPI, accountAPI, sheetsAPI, driveAPI } from '../services/api';
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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
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
      const response = await invoiceAPI.scanInvoices(user.uid, user.accessToken);
      
      if (response.data.success) {
        await loadInvoices(); // Refresh the invoice list
        await loadStats(); // Refresh stats
        await loadSpreadsheetUrl(); // Refresh spreadsheet URL
        
        const message = `Scan complete! Found ${response.data.invoicesFound} new invoices from ${response.data.emailsScanned} emails.`;
        if (response.data.errors && response.data.errors.length > 0) {
          alert(`${message}\n\nSome errors occurred:\n${response.data.errors.slice(0, 3).join('\n')}`);
        } else {
          alert(message);
        }
      } else {
        throw new Error('Scan failed');
      }
    } catch (error) {
      console.error('Fetch invoices error:', error);
      alert('Failed to fetch invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear ALL your invoice data? This action cannot be undone.\n\n' +
      'This will delete:\n' +
      '- All processed invoices\n' +
      '- All scan history\n' +
      '- Drive folder contents\n' +
      '- Google Sheets'
    );

    if (!confirmed) return;

    try {
      const response = await accountAPI.clearAllData(user.uid, user.accessToken);
      
      if (response.data.success) {
        setInvoices([]);
        setStats({
          totalInvoices: 0,
          totalAmount: 0,
          averageAmount: 0,
          vendorBreakdown: {}
        });
        setSpreadsheetUrl(null);
        
        const message = `All data cleared successfully!\n\nDeleted:\n` +
          `- ${response.data.deletedInvoices} invoices\n` +
          `- ${response.data.deletedLogs} processing logs\n` +
          `- ${response.data.driveFilesDeleted} Drive files\n` +
          `- Spreadsheet: ${response.data.spreadsheetCleared ? 'Yes' : 'No'}`;
        
        alert(message);
      } else {
        throw new Error('Clear data failed');
      }
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Failed to clear data. Please try again.');
    }

    setShowAccountMenu(false);
  };

  const handleUpdateSpreadsheet = async () => {
    try {
      const response = await sheetsAPI.updateSpreadsheet(user.uid, user.accessToken);
      if (response.data.success) {
        setSpreadsheetUrl(response.data.url);
        alert('Spreadsheet updated successfully!');
      }
    } catch (error) {
      console.error('Update spreadsheet error:', error);
      alert('Failed to update spreadsheet. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Accounti</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleFetchInvoices}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Scanning...' : 'Fetch New Invoices'}
              </button>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  📊 View Spreadsheet
                </a>
              )}
              
              <div className="flex items-center space-x-3">
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                <span className="text-gray-700">{user.name}</span>
                <div className="relative">
                  <button
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
                      <button
                        onClick={handleUpdateSpreadsheet}
                        className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        📊 Update Spreadsheet
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={handleClearAllData}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        🗑️ Clear All Data
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={signOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Invoices</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average Amount</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageAmount)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Last Scan</h3>
            <p className="text-2xl font-bold text-gray-900">
              {user.lastProcessedTimestamp ? new Date(user.lastProcessedTimestamp).toLocaleDateString() : 'Never'}
            </p>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Recent Invoices</h3>
          </div>
          <InvoiceTable invoices={invoices} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 
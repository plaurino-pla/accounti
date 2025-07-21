import React, { useState, useEffect } from 'react';
import { User, Invoice, InvoiceStats } from '../types/invoice';
import InvoiceTable from './InvoiceTable';

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onSignOut }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalAmount: 0,
    averageAmount: 0,
    vendorBreakdown: {}
  });
  const [loading, setLoading] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/invoices/${user.uid}`);
      // const data = await response.json();
      // setInvoices(data.invoices || []);
      
      // Temporary mock data
      setInvoices([]);
      calculateStats([]);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const calculateStats = (invoiceList: Invoice[]) => {
    const totalAmount = invoiceList.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const vendorBreakdown = invoiceList.reduce((acc, inv) => {
      const vendor = inv.vendorName || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + (inv.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalInvoices: invoiceList.length,
      totalAmount,
      averageAmount: invoiceList.length > 0 ? totalAmount / invoiceList.length : 0,
      lastScan: user.lastProcessedTimestamp,
      vendorBreakdown
    });
  };

  const handleFetchInvoices = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch('https://us-central1-accounti-4698b.cloudfunctions.net/api/invoices/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          accessToken: user.accessToken
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadInvoices(); // Refresh the invoice list
        alert(`Scan complete! Found ${data.invoicesFound} new invoices.`);
      } else {
        throw new Error(data.error || 'Scan failed');
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
      // TODO: Replace with actual API call
      const response = await fetch(`https://us-central1-accounti-4698b.cloudfunctions.net/api/account/clear-data`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });

      const data = await response.json();
      
      if (data.success) {
        setInvoices([]);
        calculateStats([]);
        alert('All data cleared successfully.');
      } else {
        throw new Error(data.error || 'Clear data failed');
      }
    } catch (error) {
      console.error('Clear data error:', error);
      alert('Failed to clear data. Please try again.');
    }

    setShowAccountMenu(false);
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
                        onClick={handleClearAllData}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        🗑️ Clear All Data
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={onSignOut}
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
              {stats.lastScan ? new Date(stats.lastScan).toLocaleDateString() : 'Never'}
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
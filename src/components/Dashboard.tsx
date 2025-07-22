import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Invoice, InvoiceStats, ProcessingLog, invoiceAPI, accountAPI, sheetsAPI, driveAPI, authAPI } from '../services/api';
import InvoiceTable from './InvoiceTable';
import AccountManager from './AccountManager';

interface DashboardProps {
  user: User;
  onSwitchToAdmin?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onSwitchToAdmin }) => {
  const { signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalAmount: 0,
    averageAmount: 0,
    vendorBreakdown: {}
  });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, [user.uid]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      // Load all data in parallel for better performance
      const [invoicesResponse, statsResponse, spreadsheetResponse] = await Promise.allSettled([
        invoiceAPI.getUserInvoices(user.uid),
        invoiceAPI.getInvoiceStats(user.uid),
        sheetsAPI.getSpreadsheetUrl(user.uid, user.accessToken)
      ]);

      // Handle invoices
      if (invoicesResponse.status === 'fulfilled') {
        setInvoices(invoicesResponse.value.data.invoices || []);
      } else {
        console.error('Failed to load invoices:', invoicesResponse.reason);
      }

      // Handle stats
      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value.data);
      } else {
        console.error('Failed to load stats:', statsResponse.reason);
      }

      // Handle spreadsheet URL
      if (spreadsheetResponse.status === 'fulfilled') {
        setSpreadsheetUrl(spreadsheetResponse.value.data.url);
      } else {
        console.error('Failed to load spreadsheet URL:', spreadsheetResponse.reason);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is PDF or image
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      
      if (isPDF || isImage) {
        setSelectedFile(file);
      } else {
        alert('Please select a PDF file or image (JPG, PNG, etc.).');
        setSelectedFile(null);
      }
    }
  };

  const handleManualUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    setUploadLoading(true);
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

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const base64Content = base64Data.split(',')[1]; // Remove data:application/pdf;base64, prefix
          
          const uploadData = {
            userId: user.uid,
            accessToken: currentAccessToken,
            filename: selectedFile.name,
            fileContent: base64Content,
            fileSize: selectedFile.size
          };

          const response = await invoiceAPI.uploadManualInvoice(uploadData);
          
          if (response.data.success) {
            await loadInvoices();
            await loadStats();
            await loadSpreadsheetUrl();
            
            const message = `Invoice uploaded successfully! Found ${response.data.invoicesFound} invoice from uploaded file.`;
            if (response.data.errors && response.data.errors.length > 0) {
              alert(`${message}\n\nSome errors occurred:\n${response.data.errors.slice(0, 3).join('\n')}`);
            } else {
              alert(message);
            }
            
            // Reset file selection
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } else {
            throw new Error('Upload failed');
          }
        } catch (error: any) {
          console.error('Manual upload error:', error);
          
          if (error.response?.status === 401) {
            alert('Your session has expired. Please sign in again.');
            localStorage.removeItem('accounti_user');
            window.location.reload();
          } else {
            alert(`Failed to upload invoice. Error: ${error.message}`);
          }
        } finally {
          setUploadLoading(false);
        }
      };
      
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
        setUploadLoading(false);
      };
      
      reader.readAsDataURL(selectedFile);
      
    } catch (error: any) {
      console.error('Manual upload error:', error);
      alert(`Failed to upload invoice. Error: ${error.message}`);
      setUploadLoading(false);
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

  // Show loading state while initial data is being fetched
  if (showAccountManager) {
    return <AccountManager onBack={() => setShowAccountManager(false)} />;
  }

  if (initialLoading) {
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

        {/* Loading Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user.name.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-600">
              Loading your invoice data...
            </p>
          </div>

          {/* Loading Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Table */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-gray-600">Loading your invoices...</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
                  onClick={() => setShowAccountManager(true)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-white/60"
                  title="My Account"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                
                {onSwitchToAdmin && (
                  <button
                    onClick={onSwitchToAdmin}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Admin View
                  </button>
                )}
                
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

          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-1">Manual Invoice Upload</h4>
            <p className="text-sm text-gray-600">
              Upload a PDF or image invoice directly to your account.
            </p>
            <div className="mt-4 flex items-center space-x-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
                id="invoice-upload-input"
              />
              <label
                htmlFor="invoice-upload-input"
                className="relative group bg-white/60 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Choose File</span>
              </label>
              <button
                onClick={handleManualUpload}
                disabled={uploadLoading || !selectedFile}
                className="relative group bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {uploadLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Upload Invoice</span>
                  </div>
                )}
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
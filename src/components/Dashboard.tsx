import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Invoice, InvoiceStats, ProcessingLog, invoiceAPI, accountAPI, sheetsAPI, driveAPI, authAPI, gmailAPI } from '../services/api';
import InvoiceTable from './InvoiceTable';
import AccountManager from './AccountManager';
import ActivityFeed from './ActivityFeed';
import { useActivityFeed } from '../hooks/useActivityFeed';

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
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Activity feed hook
  const {
    activities,
    isVisible: isActivityFeedVisible,
    addProcessingActivity,
    updateProcessingProgress,
    completeProcessingActivity,
    addSuccessActivity,
    addErrorActivity,
    addInfoActivity,
    addWarningActivity,
    clearActivities,
    showActivityFeed,
    hideActivityFeed,
    toggleActivityFeed,
  } = useActivityFeed();

  // Set activity feed to be open by default
  useEffect(() => {
    if (activities.length === 0) {
      showActivityFeed();
    }
  }, [showActivityFeed]);

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
    
    // Add processing activity
    const processingActivityId = addProcessingActivity(
      'Manual Invoice Upload',
      `Uploading ${selectedFile.name}...`,
      { filename: selectedFile.name, size: selectedFile.size }
    );
    
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

      // Update progress to 25%
      updateProcessingProgress(processingActivityId, 25);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const base64Content = base64Data.split(',')[1]; // Remove data:application/pdf;base64, prefix
          
          // Update progress to 50%
          updateProcessingProgress(processingActivityId, 50);
          
          const uploadData = {
            userId: user.uid,
            accessToken: currentAccessToken,
            filename: selectedFile.name,
            fileContent: base64Content,
            fileSize: selectedFile.size
          };

          const response = await invoiceAPI.uploadManualInvoice(uploadData);
          
          if (response.data.success) {
            // Update progress to 75%
            updateProcessingProgress(processingActivityId, 75);
            
            await loadInvoices();
            await loadStats();
            await loadSpreadsheetUrl();
            
            const message = `Invoice uploaded successfully! Found ${response.data.invoicesFound} invoice from uploaded file.`;
            
            // Complete with success
            completeProcessingActivity(
              processingActivityId,
              'success',
              message,
              undefined,
              { 
                invoicesFound: response.data.invoicesFound,
                filename: selectedFile.name
              }
            );
            
            if (response.data.errors && response.data.errors.length > 0) {
              addWarningActivity(
                'Upload Warnings',
                `Some errors occurred:\n${response.data.errors.slice(0, 3).join('\n')}`
              );
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
          
          // Complete with error
          completeProcessingActivity(
            processingActivityId,
            'error',
            `Failed to upload invoice: ${error.message}`,
            undefined,
            { filename: selectedFile.name, error: error.message }
          );
          
          if (error.response?.status === 401) {
            addErrorActivity(
              'Authentication Error',
              'Your session has expired. Please sign in again.'
            );
            localStorage.removeItem('accounti_user');
            window.location.reload();
          } else {
            addErrorActivity(
              'Upload Failed',
              `Failed to upload invoice: ${error.message}`
            );
          }
        } finally {
          setUploadLoading(false);
        }
      };
      
      reader.onerror = () => {
        completeProcessingActivity(
          processingActivityId,
          'error',
          'Error reading file. Please try again.',
          undefined,
          { filename: selectedFile.name }
        );
        setUploadLoading(false);
      };
      
      reader.readAsDataURL(selectedFile);
      
    } catch (error: any) {
      console.error('Manual upload error:', error);
      
      // Complete with error
      completeProcessingActivity(
        processingActivityId,
        'error',
        `Failed to upload invoice: ${error.message}`,
        undefined,
        { filename: selectedFile.name, error: error.message }
      );
      
      setUploadLoading(false);
    }
  };

  const handleFetchInvoices = async () => {
    setLoading(true);
    
    // Add processing activity
    const processingActivityId = addProcessingActivity(
      'Scanning for Invoices',
      'Starting background scan of your Gmail for invoice attachments...',
      { userId: user.uid }
    );
    
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

      // Update progress to 10%
      updateProcessingProgress(processingActivityId, 10);

      const response = await invoiceAPI.scanInvoices(user.uid, currentAccessToken);
      
      if (response.data.success) {
        // Both first-time and regular users now use background processing
        const isFirstTime = response.data.isFirstTime;
        const message = isFirstTime 
          ? 'First-time scan started in background. This may take a few minutes to complete. You can continue using the app while we process your emails.'
          : 'Scan started in background. This may take a few minutes to complete. You can continue using the app while we process your emails.';
        
        setProcessingStatus(message);
        
        // Update progress to 30%
        updateProcessingProgress(processingActivityId, 30);
        
        // Set up Gmail webhook for real-time notifications (optional)
        try {
          await gmailAPI.setupWebhook(user.uid, currentAccessToken);
          console.log('Gmail webhook set up successfully');
          addInfoActivity(
            'Gmail Webhook Setup',
            'Real-time notifications configured successfully'
          );
        } catch (webhookError) {
          console.log('Gmail webhook setup failed (optional feature):', webhookError);
          addInfoActivity(
            'Gmail Webhook Setup',
            'Real-time notifications setup failed (optional feature)'
          );
        }
        
        // Update progress to 50%
        updateProcessingProgress(processingActivityId, 50);
        
        // Start polling for updates
        startPollingForUpdates(processingActivityId);
        
        // Complete the processing activity
        completeProcessingActivity(
          processingActivityId,
          'success',
          'Background scan initiated successfully. Processing will continue in the background.',
          undefined,
          { 
            isFirstTime,
            emailsScanned: response.data.emailsScanned,
            attachmentsProcessed: response.data.attachmentsProcessed,
            invoicesFound: response.data.invoicesFound
          }
        );
      } else {
        throw new Error('Scan failed');
      }
    } catch (error: any) {
      console.error('Scan invoices error:', error);
      
      // Complete with error
      completeProcessingActivity(
        processingActivityId,
        'error',
        `Failed to scan for new invoices: ${error.message}`,
        undefined,
        { error: error.message }
      );
      
      if (error.response?.status === 401) {
        addErrorActivity(
          'Authentication Error',
          'Your session has expired. Please sign in again.'
        );
        localStorage.removeItem('accounti_user');
        window.location.reload();
      } else {
        addErrorActivity(
          'Scan Failed',
          `Failed to scan for new invoices: ${error.message}`
        );
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

  // Poll for updates during background processing
  const startPollingForUpdates = (processingActivityId?: string) => {
    const pollInterval = setInterval(async () => {
      try {
        // Check if processing is complete by looking for new invoices
        const response = await invoiceAPI.getUserInvoices(user.uid);
        const currentInvoiceCount = response.data.invoices.length;
        
        if (currentInvoiceCount > 0) {
          // Processing completed, update UI
          setProcessingStatus(null);
          await loadInvoices();
          await loadStats();
          clearInterval(pollInterval);
          
          // Update activity feed
          if (processingActivityId) {
            completeProcessingActivity(
              processingActivityId,
              'success',
              `Background processing completed! Found ${currentInvoiceCount} invoice${currentInvoiceCount > 1 ? 's' : ''}.`,
              undefined,
              { invoicesFound: currentInvoiceCount }
            );
          }
          
          // Show success message
          addSuccessActivity(
            'Processing Complete',
            `Background processing completed! Found ${currentInvoiceCount} invoice${currentInvoiceCount > 1 ? 's' : ''}.`
          );
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
        if (processingActivityId) {
          addErrorActivity(
            'Polling Error',
            'Error checking for updates during background processing'
          );
        }
      }
    }, 10000); // Poll every 10 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setProcessingStatus('Background processing may still be running. Check back in a few minutes.');
      if (processingActivityId) {
        addWarningActivity(
          'Processing Timeout',
          'Background processing may still be running. Check back in a few minutes.'
        );
      }
    }, 10 * 60 * 1000);
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
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="w-full px-4 sm:px-6 lg:px-8">
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
                {/* Activity Feed Button */}
                <button
                  onClick={toggleActivityFeed}
                  className="relative group bg-white/60 backdrop-blur-sm text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Activity</span>
                    {activities.length > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] flex items-center justify-center">
                        {activities.length}
                      </span>
                    )}
                  </div>
                </button>

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
      <main className={`w-full px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isActivityFeedVisible ? 'pr-96' : ''}`}>
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
          
          {/* Processing Status */}
          {processingStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <div>
                  <h4 className="font-medium text-blue-900">Processing in Background</h4>
                  <p className="text-sm text-blue-700">{processingStatus}</p>
                </div>
              </div>
            </div>
          )}
          
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
      
      {/* Activity Feed */}
      <ActivityFeed
        activities={activities}
        isVisible={isActivityFeedVisible}
        onClose={hideActivityFeed}
        onClearAll={clearActivities}
      />
    </div>
  );
};

export default Dashboard; 
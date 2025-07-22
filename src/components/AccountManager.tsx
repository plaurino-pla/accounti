import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountAPI } from '../services/api';

interface AccountManagerProps {
  onBack: () => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({ onBack }) => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [processingLogs, setProcessingLogs] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [profileResponse, logsResponse] = await Promise.allSettled([
        accountAPI.getUserProfile(user.uid),
        accountAPI.getProcessingLogs(user.uid, 10)
      ]);

      if (profileResponse.status === 'fulfilled') {
        setUserProfile(profileResponse.value.data.user);
      }

      if (logsResponse.status === 'fulfilled') {
        setProcessingLogs(logsResponse.value.data.logs || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;
    
    setClearDataLoading(true);
    try {
      const response = await accountAPI.clearAllData(user.uid, user.accessToken);
      
      if (response.data.success) {
        alert(`Successfully cleared all data!\n\nDeleted:\n- ${response.data.deletedInvoices} invoices\n- ${response.data.deletedLogs} processing logs\n- ${response.data.driveFilesDeleted} Drive files\n- Spreadsheet: ${response.data.spreadsheetCleared ? 'Cleared' : 'Not found'}`);
        
        // Reload user data
        await loadUserData();
        setShowClearDataConfirm(false);
      } else {
        throw new Error('Failed to clear data');
      }
    } catch (error: any) {
      console.error('Error clearing data:', error);
      alert(`Failed to clear data: ${error.message}`);
    } finally {
      setClearDataLoading(false);
    }
  };

  const handleDisconnectAccount = async () => {
    if (!user) return;
    
    if (window.confirm('Are you sure you want to disconnect your account? This will remove your Google access but keep your data.')) {
      try {
        // Clear tokens from local storage
        localStorage.removeItem('accounti_user');
        signOut();
      } catch (error) {
        console.error('Error disconnecting account:', error);
        alert('Failed to disconnect account');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-white/60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">My Account</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={user?.picture}
                  alt={user?.name}
                  className="w-16 h-16 rounded-full ring-4 ring-white/50"
                />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <p className="text-sm text-gray-500">
                    Member since {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Account Status</h4>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Active</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Last Activity</h4>
                  <p className="text-sm text-gray-600">
                    {userProfile?.lastProcessedTimestamp 
                      ? new Date(userProfile.lastProcessedTimestamp).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Plan Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Billing Plan</h2>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Free Plan</h3>
                    <p className="text-gray-600">Perfect for getting started</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">$0</p>
                    <p className="text-sm text-gray-500">per month</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">Unlimited invoice processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">Google Drive integration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">Google Sheets automation</span>
                  </div>
                </div>
                
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Upgrade Plan (Coming Soon)
                </button>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              {processingLogs.length > 0 ? (
                <div className="space-y-3">
                  {processingLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.invoicesFound} invoices found
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.startTime).toLocaleString()} • {log.emailsScanned} emails scanned
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.triggerType === 'manual' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {log.triggerType}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50">
              <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h3 className="font-medium text-red-900">Disconnect Account</h3>
                  <p className="text-sm text-red-700">Remove Google access but keep your data</p>
                </div>
                <button
                  onClick={handleDisconnectAccount}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h3 className="font-medium text-red-900">Clear All Data</h3>
                  <p className="text-sm text-red-700">Permanently delete all invoices, Drive files, and Sheets</p>
                </div>
                <button
                  onClick={() => setShowClearDataConfirm(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Clear Data Confirmation Modal */}
      {showClearDataConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Clear All Data?</h3>
            <p className="text-gray-600 mb-6">
              This action will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-1">
              <li>• All your processed invoices</li>
              <li>• All files in your Drive folder</li>
              <li>• Your Google Sheets spreadsheet</li>
              <li>• All processing logs</li>
            </ul>
            <p className="text-sm text-red-600 mb-6 font-medium">
              This action cannot be undone!
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearDataConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                disabled={clearDataLoading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {clearDataLoading ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager; 
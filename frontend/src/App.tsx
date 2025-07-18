import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { API_BASE_URL } from './config';
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import ReactPlugin from '@stagewise-plugins/react';

// Debug helpers
const DEBUG = false;
const debugLog = (component: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[${component}] ${message}`, data || '');
  }
};

const debugError = (component: string, message: string, error?: any) => {
  if (DEBUG) {
    console.error(`[${component}] ERROR: ${message}`, error || '');
  }
};

// Debug user state
const debugUserState = (user: any) => {
  if (DEBUG) {
    console.log('=== USER STATE DEBUG ===');
    console.log('User exists:', !!user);
    if (user) {
      console.log('User UID:', user.uid);
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      console.log('Gmail connected:', user.gmailConnected);
      console.log('Drive connected:', user.driveConnected);
      console.log('Onboarding completed:', user.onboardingCompleted);
    }
    console.log('========================');
  }
};

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHpKMBMcoyv_16th5J7na5EkqUKGbT_LM",
  authDomain: "accounti-4698b.firebaseapp.com",
  projectId: "accounti-4698b",
  storageBucket: "accounti-4698b.firebasestorage.app",
  messagingSenderId: "1078251169969",
  appId: "1:1078251169969:web:9630ec0c3a1567214c1a90",
  measurementId: "G-JC923R73DB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

interface User {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  gmailConnected?: boolean;
  driveConnected?: boolean;
  onboardingCompleted?: boolean;
}

interface Invoice {
  id: string;
  fileName: string;
  vendor?: string;
  amount?: number;
  status: string;
  createdAt: string;
}

interface Stats {
  totalAmount: number;
  totalCount: number;
  avgAmount: number;
  vendorStats: Record<string, number>;
}

// API service with authentication
const apiService = {
  async getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },

  async getGoogleAuthUrl() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/url`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get Google auth URL');
    }
  },
  async connectGmail() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/gmail/connect`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to connect Gmail');
    }
  },
  async connectDrive() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/drive/connect`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to connect Google Drive');
    }
  },
  async completeOnboarding() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to complete onboarding');
    }
  },
  async signOut() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: 'POST',
        headers
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  },
  async scanGmail(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/gmail/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId })
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to scan Gmail');
    }
  },
  async createSpreadsheet(userId: string, invoices: any[]) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/spreadsheet/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, invoices })
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to create spreadsheet');
    }
  },
  async getInvoices() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/invoices`, {
        headers
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get invoices');
    }
  },
  async getInvoiceStats() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/invoices/stats`, {
        headers
      });
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get invoice stats');
    }
  }
};

// Authentication context
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    debugLog('useAuth', 'Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      debugLog('useAuth', 'Auth state changed:', firebaseUser);
      if (firebaseUser) {
        // Try to get existing user data from localStorage
        const existingUserData = localStorage.getItem('user');
        let userData: User;
        
        if (existingUserData) {
          try {
            const parsed = JSON.parse(existingUserData);
            // Merge Firebase user with existing user data
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || parsed.name || undefined,
              picture: firebaseUser.photoURL || parsed.picture || undefined,
              gmailConnected: parsed.gmailConnected || false,
              driveConnected: parsed.driveConnected || false,
              onboardingCompleted: parsed.onboardingCompleted || false
            };
            debugLog('useAuth', 'Merged with existing user data:', userData);
          } catch (error) {
            debugError('useAuth', 'Failed to parse existing user data:', error);
            // Fallback to basic user data
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || undefined,
              picture: firebaseUser.photoURL || undefined,
              gmailConnected: false,
              driveConnected: false,
              onboardingCompleted: false
            };
          }
        } else {
          // No existing data, create new user
          userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || undefined,
            picture: firebaseUser.photoURL || undefined,
            gmailConnected: false,
            driveConnected: false,
            onboardingCompleted: false
          };
        }
        
        debugLog('useAuth', 'Setting user data:', userData);
        debugUserState(userData);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        debugLog('useAuth', 'No user, clearing state');
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Cleanup function to prevent multiple listeners
    return () => {
      debugLog('useAuth', 'Cleaning up auth state listener');
      unsubscribe();
    };
  }, []); // Empty dependency array to run only once

  const signInWithGoogleHandler = async () => {
    try {
      debugLog('useAuth', 'Starting Google sign-in...');
      const result = await signInWithPopup(auth, googleProvider);
      debugLog('useAuth', 'Sign-in successful:', result.user);
      // The onAuthStateChanged will handle the user state update
    } catch (error) {
      debugError('useAuth', 'Failed to sign in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      debugLog('useAuth', 'Signing out...');
      await firebaseSignOut(auth);
      // The onAuthStateChanged will handle the user state update
    } catch (error) {
      debugError('useAuth', 'Sign out error:', error);
      throw error;
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      debugLog('useAuth', 'Updating user state:', updatedUser);
      debugUserState(updatedUser);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return { user, loading, signInWithGoogle: signInWithGoogleHandler, signOut, updateUser };
};

// Login Component
const Login: React.FC = () => {
  const { signInWithGoogle, user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  debugLog('Login', 'Render - user:', { user, loading });

  // If user is already signed in, redirect to dashboard
  if (user) {
    debugLog('Login', 'User already signed in, redirecting to dashboard');
    return <Navigate to="/" />;
  }

  // If still loading, show loading state
  if (loading) {
    debugLog('Login', 'Still loading, showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async () => {
    debugLog('Login', 'Handle sign in clicked');
    setSigningIn(true);
    try {
      await signInWithGoogle();
      debugLog('Login', 'Sign in completed successfully');
    } catch (error) {
      debugError('Login', 'Sign-in error:', error);
      alert('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  debugLog('Login', 'Rendering login form');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Accounti
          </h1>
          <p className="text-lg text-gray-600">
            Smart Invoice Organizer for Accounting
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Automate invoice capture, classification, and storage from email using OCR and Google APIs.
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
                Sign in to get started
              </h2>
            </div>
            
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {signingIn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Onboarding Component
const Onboarding: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);

  debugLog('Onboarding', 'Render - user:', { user, currentStep });

  const connectGmail = async () => {
    if (!user) return;
    
    debugLog('Onboarding', 'Connecting Gmail...');
    setGmailConnecting(true);
    try {
      const result = await apiService.connectGmail();
      if (result.success) {
        debugLog('Onboarding', 'Gmail connected successfully');
        updateUser({ gmailConnected: true });
        setCurrentStep(2);
      }
    } catch (error) {
      debugError('Onboarding', 'Failed to connect Gmail:', error);
    } finally {
      setGmailConnecting(false);
    }
  };

  const connectDrive = async () => {
    if (!user) return;
    
    debugLog('Onboarding', 'Connecting Drive...');
    setDriveConnecting(true);
    try {
      const result = await apiService.connectDrive(user.uid);
      if (result.success) {
        debugLog('Onboarding', 'Drive connected successfully');
        updateUser({ driveConnected: true });
        setCurrentStep(3);
      }
    } catch (error) {
      debugError('Onboarding', 'Failed to connect Google Drive:', error);
    } finally {
      setDriveConnecting(false);
    }
  };

  const completeOnboarding = async () => {
    if (!user) {
      return;
    }
    
    try {
      debugLog('Onboarding', 'Completing onboarding for user:', user.uid);
      
      // Store completion in localStorage with a simple flag
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('userOnboarded', user.uid);
      
      debugLog('Onboarding', 'Onboarding marked as completed in localStorage');
      
      // Force redirect to dashboard
      window.location.href = '/';
      
    } catch (error) {
      // Even if there's an error, mark as complete and redirect
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('userOnboarded', user.uid);
      window.location.href = '/';
    }
  };

  if (!user) {
    debugLog('Onboarding', 'No user, redirecting to login');
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.name}!
          </h1>
          <p className="text-gray-600">
            Let's set up your account to start organizing invoices
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Connect Gmail */}
          {currentStep === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.819L12 10.91l9.545-7.089h.819c.904 0 1.636.732 1.636 1.636z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect Gmail Account
              </h3>
              <p className="text-gray-600 mb-6">
                Allow Accounti to read your emails to automatically detect and process invoices
              </p>
              <button
                onClick={connectGmail}
                disabled={gmailConnecting}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
              >
                {gmailConnecting ? 'Connecting...' : 'Connect Gmail'}
              </button>
            </div>
          )}

          {/* Step 2: Connect Google Drive */}
          {currentStep === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect Google Drive
              </h3>
              <p className="text-gray-600 mb-6">
                Allow Accounti to create and manage spreadsheets with your invoice data
              </p>
              <button
                onClick={connectDrive}
                disabled={driveConnecting}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
              >
                {driveConnecting ? 'Connecting...' : 'Connect Google Drive'}
              </button>
            </div>
          )}

          {/* Step 3: Complete Setup */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Setup Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                Your account is ready. Accounti will now scan your emails for invoices and organize them in Google Sheets.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    completeOnboarding();
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-md"
                >
                  Complete Setup
                </button>
                <button
                  onClick={() => {
                    debugLog('Onboarding', 'Manual dashboard navigation triggered');
                    const updatedUser = { ...user, onboardingCompleted: true };
                    updateUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    debugLog('Onboarding', 'User state updated manually');
                    // Navigate to dashboard
                    navigate('/', { replace: true });
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Go to Dashboard (Navigate)
                </button>
                <button
                  onClick={() => {
                    debugLog('Onboarding', 'Direct navigation test');
                    navigate('/', { replace: true });
                  }}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Direct Navigate (No State Change)
                </button>
                <button
                  onClick={() => {
                    debugLog('Onboarding', 'Manual dashboard navigation triggered');
                    const updatedUser = { ...user, onboardingCompleted: true };
                    updateUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    debugLog('Onboarding', 'User state updated manually');
                    // Force a page reload to trigger routing
                    window.location.href = '/';
                  }}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Go to Dashboard (Force Reload)
                </button>
                <button
                  onClick={() => {
                    alert('JavaScript is working!');
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Test JavaScript (Alert)
                </button>
                <button
                  onClick={() => {
                    console.log('🧪 Testing onboarding completion...');
                    localStorage.setItem('onboardingCompleted', 'true');
                    localStorage.setItem('userOnboarded', user.uid);
                    console.log('✅ localStorage set:', {
                      onboardingCompleted: localStorage.getItem('onboardingCompleted'),
                      userOnboarded: localStorage.getItem('userOnboarded')
                    });
                    window.location.href = '/';
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Test Completion (Console)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  debugLog('Dashboard', 'Render - user:', user);

  useEffect(() => {
    if (user) {
      debugLog('Dashboard', 'User exists, loading dashboard data');
      loadDashboardData();
    } else {
      debugLog('Dashboard', 'No user, skipping data load');
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      debugLog('Dashboard', 'Loading dashboard data for user:', user.uid);
      const [invoicesData, statsData] = await Promise.all([
        apiService.getInvoices(),
        apiService.getInvoiceStats()
      ]);
      
      debugLog('Dashboard', 'Dashboard data loaded successfully');
      setInvoices(invoicesData);
      setStats(statsData);
    } catch (error) {
      debugError('Dashboard', 'Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startProcessing = async () => {
    if (!user) return;
    
    debugLog('Dashboard', 'Starting invoice processing');
    setProcessing(true);
    try {
      const result = await apiService.scanGmail(user.uid);
      if (result.success && result.invoices && result.invoices.length > 0) {
        debugLog('Dashboard', 'Processing completed, invoices found:', result.invoices.length);
        // Add new processed invoices to the list
        setInvoices(prev => [...result.invoices, ...prev]);
        
        // Create spreadsheet with the new invoices
        const spreadsheetResult = await apiService.createSpreadsheet(user.uid, result.invoices);
        if (spreadsheetResult.success) {
          alert(`Created spreadsheet with ${spreadsheetResult.rowsAdded || result.invoices.length} invoices!`);
        }
      } else {
        alert('No new invoices found in your Gmail.');
      }
    } catch (error) {
      debugError('Dashboard', 'Failed to process invoices:', error);
      alert('Failed to process invoices. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Simple test render first
  if (!user) {
    debugLog('Dashboard', 'No user in Dashboard, showing error');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">No User Found</h1>
          <p className="text-gray-600">Please sign in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  // Test render with user info
  debugLog('Dashboard', 'User info:', { name: user.name, onboardingCompleted: user.onboardingCompleted });

  // Check localStorage for onboarding completion
  const isOnboarded = localStorage.getItem('onboardingCompleted') === 'true' && localStorage.getItem('userOnboarded') === user.uid;
  
  if (!isOnboarded) {
    debugLog('Dashboard', 'User not onboarded in Dashboard, redirecting to onboarding');
    return <Navigate to="/onboarding" />;
  }

  if (loading) {
    debugLog('Dashboard', 'Loading state, showing spinner');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    debugLog('Dashboard', 'Error state:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  debugLog('Dashboard', 'Rendering dashboard with user:', user.name);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user.name}!
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Here's what's happening with your invoices
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={startProcessing}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Scan for Invoices'}
              </button>
              <button 
                onClick={signOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-8 px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Connections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${user.gmailConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">Gmail</span>
                <span className="ml-auto text-sm text-gray-500">
                  {user.gmailConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${user.driveConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">Google Drive</span>
                <span className="ml-auto text-sm text-gray-500">
                  {user.driveConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Amount
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${stats.totalAmount ? stats.totalAmount.toLocaleString() : '0'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Invoices
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalCount || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Average Amount
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${stats.avgAmount ? stats.avgAmount.toLocaleString() : '0'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Vendors
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.vendorStats ? Object.keys(stats.vendorStats).length : 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Invoices */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Invoices
            </h3>
            {invoices.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.fileName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.vendor || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.amount ? `$${invoice.amount.toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'processed' 
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Scan your Gmail to find and process invoices automatically.
                </p>
                <div className="mt-6">
                  <button
                    onClick={startProcessing}
                    disabled={processing}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {processing ? 'Scanning...' : 'Scan Gmail for Invoices'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// QA Test Suite
const QATestSuite = () => {
  const runTests = () => {
    console.log('🧪 Starting QA Test Suite...');
    
    // Test 1: Check if user is authenticated
    const user = auth.currentUser;
    console.log('✅ Test 1 - User Auth:', user ? 'PASSED' : 'FAILED', user);
    
    // Test 2: Check localStorage
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    const userOnboarded = localStorage.getItem('userOnboarded');
    console.log('✅ Test 2 - localStorage:', {
      onboardingCompleted,
      userOnboarded,
      expected: user ? user.uid : 'no user'
    });
    
    // Test 3: Check current route
    const currentPath = window.location.pathname;
    console.log('✅ Test 3 - Current Route:', currentPath);
    
    // Test 4: Check if user should be onboarded
    const shouldBeOnboarded = onboardingCompleted === 'true' && userOnboarded === user?.uid;
    console.log('✅ Test 4 - Should be onboarded:', shouldBeOnboarded);
    
    // Test 5: Check routing logic
    const expectedRoute = !user ? '/login' : 
                         shouldBeOnboarded ? '/' : '/onboarding';
    console.log('✅ Test 5 - Expected Route:', expectedRoute, 'Current:', currentPath);
    
    // Test 6: Check if navigation is needed
    const needsNavigation = currentPath !== expectedRoute;
    console.log('✅ Test 6 - Needs Navigation:', needsNavigation);
    
    // Test 7: Manual navigation test
    if (needsNavigation) {
      console.log('🔄 Test 7 - Attempting navigation to:', expectedRoute);
      window.location.href = expectedRoute;
    }
    
    console.log('🧪 QA Test Suite Complete');
  };

  const forceOnboarding = () => {
    const user = auth.currentUser;
    if (user) {
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('userOnboarded', user.uid);
      console.log('🔧 Force onboarding completed for:', user.uid);
      window.location.href = '/';
    }
  };

  const clearOnboarding = () => {
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('userOnboarded');
    console.log('🧹 Cleared onboarding data');
    window.location.href = '/onboarding';
  };

  const testNavigation = () => {
    console.log('🧭 Testing navigation...');
    window.location.href = '/';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🧪 QA TEST SUITE</div>
      
      <button 
        onClick={runTests}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          marginBottom: '5px',
          width: '100%'
        }}
      >
        Run All Tests
      </button>
      
      <button 
        onClick={forceOnboarding}
        style={{
          background: '#28a745',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          marginBottom: '5px',
          width: '100%'
        }}
      >
        Force Onboarding
      </button>
      
      <button 
        onClick={clearOnboarding}
        style={{
          background: '#dc3545',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          marginBottom: '5px',
          width: '100%'
        }}
      >
        Clear Onboarding
      </button>
      
      <button 
        onClick={testNavigation}
        style={{
          background: '#ffc107',
          color: 'black',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          width: '100%'
        }}
      >
        Test Navigation
      </button>
      
      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.8 }}>
        Check console for results
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const { user, loading } = useAuth();

  debugLog('App', 'Render - user:', { user, loading });
  debugLog('App', 'User onboarding completed:', user?.onboardingCompleted);

  // Show loading screen while checking authentication
  if (loading) {
    debugLog('App', 'App is loading...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !user ? <Login /> : <Navigate to="/" />
        } />
        <Route path="/onboarding" element={
          !user ? <Navigate to="/login" /> : 
          (localStorage.getItem('onboardingCompleted') === 'true' && localStorage.getItem('userOnboarded') === user?.uid) ? <Navigate to="/" /> : 
          <Onboarding />
        } />
        <Route path="/dashboard" element={
          !user ? <Navigate to="/login" /> : 
          (localStorage.getItem('onboardingCompleted') !== 'true' || localStorage.getItem('userOnboarded') !== user?.uid) ? <Navigate to="/onboarding" /> : 
          <Dashboard />
        } />
        <Route path="/" element={
          !user ? <Navigate to="/login" /> : 
          (localStorage.getItem('onboardingCompleted') !== 'true' || localStorage.getItem('userOnboarded') !== user?.uid) ? <Navigate to="/onboarding" /> : 
          <Dashboard />
        } />
        <Route path="*" element={
          !user ? <Navigate to="/login" /> : 
          (localStorage.getItem('onboardingCompleted') !== 'true' || localStorage.getItem('userOnboarded') !== user?.uid) ? <Navigate to="/onboarding" /> : 
          <Navigate to="/" />
        } />
      </Routes>
      <QATestSuite />
      <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
    </Router>
  );
};

export default App; 
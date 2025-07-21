import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Accounti
          </h1>
          <p className="text-gray-600 mb-8">
            AI-powered invoice management for your business
          </p>
          
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 mb-2">What Accounti does:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Scans your Gmail for invoices automatically</li>
                <li>• Extracts data using Google Document AI</li>
                <li>• Stores invoices in your Google Drive</li>
                <li>• Creates a spreadsheet with all invoice data</li>
                <li>• Provides a beautiful dashboard to manage everything</li>
              </ul>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 mb-2">Permissions needed:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Read your Gmail (to find invoices)</li>
                <li>• Access your Google Drive (to store files)</li>
                <li>• Create Google Sheets (to organize data)</li>
                <li>• Your basic profile info</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          By continuing, you agree to our terms and privacy policy. 
          We'll only access the data necessary to provide our service.
        </p>
      </div>
    </div>
  );
};

export default AuthComponent; 
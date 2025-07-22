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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            Welcome to Accounti
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered invoice management for your business
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <div className="space-y-6">
            {/* Features */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg">What Accounti does:</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Scans your Gmail for invoices automatically</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Extracts data using ChatGPT AI</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Stores invoices in your Google Drive</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Creates a spreadsheet with all invoice data</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Provides a beautiful dashboard to manage everything</span>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg">Permissions needed:</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Read your Gmail (to find invoices)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Access your Google Drive (to store files)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Create Google Sheets (to organize data)</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Your basic profile info</span>
                </div>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center">
          By continuing, you agree to our terms and privacy policy. 
          <br />
          We'll only access the data necessary to provide our service.
        </p>
      </div>
    </div>
  );
};

export default AuthComponent; 
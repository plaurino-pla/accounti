import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { User } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is admin (you can modify this logic)
  const isAdmin = user?.email === 'pablolaurino@gmail.com' || user?.email === 'admin@accounti.com' || user?.email === 'plaurino@publica.la';

  // If impersonating, show impersonated user's dashboard
  if (impersonatedUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 fixed top-0 left-0 right-0 z-50">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-800 font-medium">
                Impersonating: {impersonatedUser.name} ({impersonatedUser.email})
              </span>
            </div>
            <button
              onClick={() => setImpersonatedUser(null)}
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
            >
              Stop Impersonating
            </button>
          </div>
        </div>
        <div className="pt-16">
          <Dashboard user={impersonatedUser} isImpersonating={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? (
        isAdmin && isAdminView ? (
          <AdminDashboard 
            onSwitchToUser={() => setIsAdminView(false)} 
            onImpersonateUser={setImpersonatedUser}
          />
        ) : (
          <Dashboard user={user} onSwitchToAdmin={isAdmin ? () => setIsAdminView(true) : undefined} />
        )
      ) : (
        <LandingPage />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App; 
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is admin (you can modify this logic)
  const isAdmin = user?.email === 'pablolaurino@gmail.com' || user?.email === 'admin@accounti.com' || user?.email === 'plaurino@publica.la';

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? (
        isAdmin ? (
          <AdminDashboard />
        ) : (
          <Dashboard user={user} />
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
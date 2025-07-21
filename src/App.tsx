import React, { useState, useEffect } from 'react';
import { User } from './types/invoice';
import AuthComponent from './components/AuthComponent';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const checkAuth = async () => {
      try {
        // TODO: Implement proper auth check with Firebase
        const storedUser = localStorage.getItem('accounti_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignIn = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('accounti_user', JSON.stringify(userData));
  };

  const handleSignOut = async () => {
    setUser(null);
    localStorage.removeItem('accounti_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? (
        <Dashboard user={user} onSignOut={handleSignOut} />
      ) : (
        <AuthComponent onSignIn={handleSignIn} />
      )}
    </div>
  );
};

export default App; 
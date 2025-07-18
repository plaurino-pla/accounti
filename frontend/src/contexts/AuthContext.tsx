import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface User {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  subscription?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // For development, create a mock user
      const mockUser = {
        uid: 'mock-user-id',
        email: 'user@example.com',
        name: 'Mock User',
        subscription: 'free'
      };
      setUser(mockUser);
      localStorage.setItem('authToken', 'mock-token');
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const signInWithGoogle = async () => {
    try {
      // For development, just set mock user
      const mockUser = {
        uid: 'mock-user-id',
        email: 'user@example.com',
        name: 'Mock User',
        subscription: 'free'
      };
      setUser(mockUser);
      localStorage.setItem('authToken', 'mock-token');
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('accounti_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // Validate token
          try {
            await authAPI.validateToken(userData.accessToken);
            setUser(userData);
          } catch (error) {
            console.log('Token validation failed, clearing stored user');
            localStorage.removeItem('accounti_user');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('accounti_user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle OAuth callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        setUser(userData);
        localStorage.setItem('accounti_user', JSON.stringify(userData));
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error parsing user data from URL:', error);
      }
    }
  }, []);

  const signIn = async () => {
    try {
      const response = await authAPI.getAuthUrl();
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Failed to initiate sign in');
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('accounti_user');
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const response = await authAPI.refreshToken(user.uid);
      const updatedUser = { ...user, accessToken: response.data.accessToken };
      setUser(updatedUser);
      localStorage.setItem('accounti_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, sign out the user
      await signOut();
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
import React, { createContext, useContext, ReactNode } from 'react';

interface SubscriptionContextType {
  currentPlan: 'free' | 'pro' | 'premium';
  usage: {
    invoicesThisMonth: number;
    monthlyLimit: number;
  };
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  // Mock data for now
  const value = {
    currentPlan: 'free' as const,
    usage: {
      invoicesThisMonth: 0,
      monthlyLimit: 20
    }
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 
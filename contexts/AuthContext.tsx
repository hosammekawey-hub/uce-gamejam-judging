
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { SyncService } from '../services/syncService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const u = await SyncService.getCurrentUser();
    setUser(u);
    setLoading(false);
  };

  useEffect(() => {
    // Initial check
    refreshUser();

    // Subscribe to changes
    const { data: { subscription } } = SyncService.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            setUser(null);
        } else if (session?.user) {
            setUser({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
                avatar_url: session.user.user_metadata.avatar_url
            });
        }
        setLoading(false);
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await SyncService.signInWithGoogle();
  };

  const signOut = async () => {
    await SyncService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

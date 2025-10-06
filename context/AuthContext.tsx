
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log('Checking admin status for user:', userId);
      
      // Use the is_admin_user function to check admin status
      const { data: isAdminResult, error } = await supabase.rpc('is_admin_user');
      
      if (error) {
        console.error('Error calling is_admin_user RPC:', error);
        return false;
      }

      console.log('Admin status result:', isAdminResult);
      return isAdminResult || false;
    } catch (error) {
      console.error('Exception checking admin status:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Step 1: Register with Supabase Auth (this works reliably)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) return { error };

      // Step 2: Create user record, wallet, and referral code via direct database insertion
      if (data.user) {
        try {
          // Generate unique referral code
          const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          
          // Insert user record directly into database
          await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email,
            name: name,
            referral_code: referralCode
          });

          // Create wallet for the user
          await supabase.from('wallet').insert({
            user_id: data.user.id,
            balance: 0.00
          });
          
          console.log('User registration complete with wallet and referral code');
        } catch (dbError) {
          console.warn('Database record creation failed (non-critical):', dbError);
          // Don't fail registration if DB records fail - user can still use the app
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const adminStatus = await checkAdminStatus(user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          // Make admin status check non-blocking to prevent hanging
          checkAdminStatus(session.user.id)
            .then(adminStatus => setIsAdmin(adminStatus))
            .catch(error => {
              console.warn('Admin status check failed during init (non-blocking):', error);
              setIsAdmin(false);
            });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session?.user) {
          setUser(session.user);
          // Make admin status check non-blocking to prevent hanging
          checkAdminStatus(session.user.id)
            .then(adminStatus => setIsAdmin(adminStatus))
            .catch(error => {
              console.warn('Admin status check failed (non-blocking):', error);
              setIsAdmin(false);
            });
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      refreshUser
    }}>
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

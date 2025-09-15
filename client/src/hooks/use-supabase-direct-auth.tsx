import { useEffect, useState, createContext, useContext } from 'react';
import { auth, supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Context for authentication state
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Authentication Provider Component
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email || null);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting Supabase signin with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase signin response:', { data, error });

      if (error) {
        console.error('Supabase signin error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from Supabase' };
      }

      console.log('✓ Supabase signin successful:', data.user.email);
      return { success: true };

    } catch (error) {
      console.error('Signin catch error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      setLoading(true);
      console.log('Attempting Supabase signup with email:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      console.log('Supabase signup response:', { data, error });

      if (error) {
        console.error('Supabase signup error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from Supabase' };
      }

      console.log('✓ Supabase signup successful:', data.user.email);
      return { success: true };

    } catch (error) {
      console.error('Signup catch error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Signing out from Supabase');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signout error:', error.message);
        throw error;
      }

      console.log('✓ Supabase signout successful');
      setUser(null);
      
    } catch (error) {
      console.error('Signout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      setLoading(true);
      console.log('Updating Supabase user profile:', updates);

      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        console.error('Profile update error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✓ Profile updated successfully:', data);
      return { success: true };

    } catch (error) {
      console.error('Update profile catch error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use authentication
export function useSupabaseDirectAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseDirectAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// Additional helper functions for user profile management
export const userProfile = {
  // Get current user profile from Supabase auth metadata
  getCurrentUserProfile: () => {
    return supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) throw error;
      return user?.user_metadata || null;
    });
  },

  // Update user metadata (profile info)
  updateUserMetadata: async (metadata: any) => {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });
    if (error) throw error;
    return data.user;
  },

  // Get user's email and basic info
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};
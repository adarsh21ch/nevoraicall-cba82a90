import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const liveUrl = 'https://wpczgwxsriezaubncuom.lovable.app';
    
    // Check if we're on a preview URL with OAuth tokens - redirect to live domain
    const currentUrl = window.location.href;
    const isPreviewUrl = currentUrl.includes('.lovable.app') && !currentUrl.includes('wpczgwxsriezaubncuom');
    const hasAuthToken = window.location.hash.includes('access_token');
    
    if (isPreviewUrl && hasAuthToken) {
      // Redirect to live domain with the same hash
      window.location.href = `${liveUrl}/home${window.location.hash}`;
      return;
    }

    let initialSessionChecked = false;

    // Check for existing session FIRST (from localStorage)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!initialSessionChecked) {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        initialSessionChecked = true;
        setLoading(false);
      }
    });

    // Set up auth state listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Always update on explicit auth events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
          initialSessionChecked = true;
        } else if (initialSessionChecked) {
          // Only update for other events after initial check
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // Use live domain for email redirect to avoid preview shell issues
    const liveUrl = 'https://wpczgwxsriezaubncuom.lovable.app';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${liveUrl}/`
      }
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    // Always clear local state even if server call fails
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

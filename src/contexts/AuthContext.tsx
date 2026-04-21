import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, UserProfile, getProfile } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env-config';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  forceSkipLoading: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  forceSkipLoading: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout for initial sync total - decreased to 12s
    const initialSyncTimeout = setTimeout(() => {
      console.warn('AuthContext: Safety timeout reached. Forcing loading to end.');
      setLoading(false);
    }, 12000);

    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.warn('AuthContext: Supabase URL is not configured. Skipping auth sync.');
      setLoading(false);
      return;
    }

    // Get initial session
    const getSessionWithTimeout = async () => {
      console.log('AuthContext: Fetching initial session...');
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), 8000)
      );
      const sessionAttempt = supabase.auth.getSession();
      return Promise.race([sessionAttempt, timeout]) as Promise<{ data: { session: Session | null } }>;
    };

    getSessionWithTimeout().then(({ data: { session } }) => {
      console.log('AuthContext: Session fetch complete', { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('AuthContext: Initial session fetch timed out or failed', err);
      // Even if session fails/times out, we must stop loading to show login
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const supabaseUrl = getEnv('VITE_SUPABASE_URL');
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.warn('AuthContext: Using placeholder Supabase URL. Authentication and profile sync will not work until VITE_SUPABASE_URL is configured.');
      }
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(initialSyncTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(uid: string, retryCount = 0) {
    console.log(`AuthContext: Fetching profile for ${uid} (attempt ${retryCount + 1})...`);
    try {
      // Shorter timeout per attempt (5s) to allow faster retries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      const profilePromise = getProfile(uid);
      
      const p = await Promise.race([profilePromise, timeoutPromise]) as UserProfile | null;
      console.log(`AuthContext: Profile fetch successful for ${uid}`);
      setProfile(p);
      setLoading(false); // Success, stop loading
    } catch (err) {
      console.error(`AuthContext: Profile sync failed (attempt ${retryCount + 1}) - uid: ${uid}`, err);
      if (retryCount < 1) {
        // Exponential backoff for retries
        const backoff = Math.pow(2, retryCount) * 1000;
        console.log(`AuthContext: Retrying profile fetch in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchProfile(uid, retryCount + 1);
      }
      setLoading(false); // Give up after retries
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      // Force wipe local state to guarantee redirect to login
      setSession(null);
      setUser(null);
      setProfile(null);
      localStorage.removeItem('supabase.auth.token'); // Safety clear
    }
  };

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      console.log('AuthContext: Manual profile refresh requested');
      await fetchProfile(user.id);
    }
  }, [user]);

  const forceSkipLoading = () => {
    console.log('AuthContext: Force skipping loading state');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, forceSkipLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

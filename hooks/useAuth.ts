import { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevents a stale fetchProfile from overwriting a newer one
  const fetchCountRef = useRef(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const fetchId = ++fetchCountRef.current;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, institution:institutions(*)')
        .eq('user_id', userId)
        .single();
      // Discard result if a newer fetch has started
      if (fetchId !== fetchCountRef.current) return;
      setProfile(data);
    } finally {
      if (fetchId === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return {
    session,
    profile,
    loading,
    signOut,
    refetchProfile: () => session && fetchProfile(session.user.id),
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadNotifications(userId?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    async function fetchCount() {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      setCount(c ?? 0);
    }

    fetchCount();

    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return count;
}

'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

function getSupabase() {
  return createClient();
}

interface NotificationItem {
  id: string;
  clientId: string;
  clientName: string;
  type: 'message' | 'document_signed';
  preview?: string;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const supabase = getSupabase();
      const items: NotificationItem[] = [];

      // Unread client messages
      const { data: unreadMessages } = await supabase
        .from('onboarding_activity_log')
        .select('id, client_id, details, created_at')
        .eq('action', 'message_sent')
        .eq('actor', 'client')
        .eq('read_by_admin', false)
        .order('created_at', { ascending: false });

      if (unreadMessages && unreadMessages.length > 0) {
        // Fetch client names
        const clientIds = [...new Set(unreadMessages.map((m) => m.client_id))];
        const { data: clients } = await supabase
          .from('onboarding_clients')
          .select('id, first_name, last_name')
          .in('id', clientIds);

        const clientMap = new Map(clients?.map((c) => [c.id, `${c.first_name} ${c.last_name}`]) ?? []);

        for (const msg of unreadMessages) {
          items.push({
            id: msg.id,
            clientId: msg.client_id,
            clientName: clientMap.get(msg.client_id) ?? 'Unknown',
            type: 'message',
            preview: (msg.details as { message?: string })?.message?.slice(0, 80),
            createdAt: msg.created_at,
          });
        }
      }

      // Recent document signatures (last 48h)
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: recentSigs } = await supabase
        .from('onboarding_activity_log')
        .select('id, client_id, action, created_at')
        .in('action', ['packet1_submitted', 'contract_signed'])
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false });

      if (recentSigs && recentSigs.length > 0) {
        const clientIds = [...new Set(recentSigs.map((s) => s.client_id))];
        const { data: clients } = await supabase
          .from('onboarding_clients')
          .select('id, first_name, last_name')
          .in('id', clientIds);

        const clientMap = new Map(clients?.map((c) => [c.id, `${c.first_name} ${c.last_name}`]) ?? []);

        for (const sig of recentSigs) {
          items.push({
            id: sig.id,
            clientId: sig.client_id,
            clientName: clientMap.get(sig.client_id) ?? 'Unknown',
            type: 'document_signed',
            preview: sig.action === 'packet1_submitted' ? 'Submitted intake documents' : 'Signed contract',
            createdAt: sig.created_at,
          });
        }
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return items;
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { count, error } = await getSupabase()
        .from('onboarding_activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'message_sent')
        .eq('actor', 'client')
        .eq('read_by_admin', false);
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });
}

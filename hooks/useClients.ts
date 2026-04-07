'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OnboardingClient, OnboardingSignature, ActivityLogEntry, ClientStatus, ServiceType } from '@/types';

function getSupabase() {
  return createClient();
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('onboarding_clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OnboardingClient[];
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('onboarding_clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as OnboardingClient;
    },
    enabled: !!id,
  });
}

export function useClientSignatures(clientId: string) {
  return useQuery({
    queryKey: ['signatures', clientId],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('onboarding_signatures')
        .select('*, document:onboarding_documents(name, slug, document_type)')
        .eq('client_id', clientId)
        .order('signed_at', { ascending: true });
      if (error) throw error;
      return data as (OnboardingSignature & { document: { name: string; slug: string; document_type: string } })[];
    },
    enabled: !!clientId,
  });
}

export function useClientActivity(clientId: string) {
  return useQuery({
    queryKey: ['activity', clientId],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('onboarding_activity_log')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: { first_name: string; last_name: string; email: string; phone?: string; notes?: string }) => {
      const { data, error } = await getSupabase()
        .from('onboarding_clients')
        .insert({
          ...client,
          status: 'packet1_sent' as ClientStatus,
          packet1_sent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Log activity
      await getSupabase().from('onboarding_activity_log').insert({
        client_id: data.id,
        action: 'lead_created',
        details: { name: `${client.first_name} ${client.last_name}` },
        actor: 'admin',
      });

      // Send welcome email via API route
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: data.id }),
        });
      } catch {
        // Non-fatal
      }

      return data as OnboardingClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OnboardingClient> & { id: string }) => {
      const { data, error } = await getSupabase()
        .from('onboarding_clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as OnboardingClient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
    },
  });
}

export function useApprovePacket1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await getSupabase()
        .from('onboarding_clients')
        .update({
          status: 'packet1_approved' as ClientStatus,
          packet1_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();
      if (error) throw error;

      await getSupabase().from('onboarding_activity_log').insert({
        client_id: clientId,
        action: 'packet1_approved',
        actor: 'admin',
      });

      return data as OnboardingClient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      queryClient.invalidateQueries({ queryKey: ['activity', data.id] });
    },
  });
}

export function useSendContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, serviceType, paymentAmountCents }: {
      clientId: string;
      serviceType: ServiceType;
      paymentAmountCents: number;
    }) => {
      const { data, error } = await getSupabase()
        .from('onboarding_clients')
        .update({
          service_type: serviceType,
          payment_amount_cents: paymentAmountCents,
          status: 'contract_sent' as ClientStatus,
          contract_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();
      if (error) throw error;

      await getSupabase().from('onboarding_activity_log').insert({
        client_id: clientId,
        action: 'contract_sent',
        details: { service_type: serviceType, amount_cents: paymentAmountCents },
        actor: 'admin',
      });

      // Send contract email via API route
      try {
        await fetch('/api/email/contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId }),
        });
      } catch {
        // Non-fatal
      }

      return data as OnboardingClient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      queryClient.invalidateQueries({ queryKey: ['activity', data.id] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const supabase = getSupabase();

      const { data: client } = await supabase
        .from('onboarding_clients')
        .select('payment_amount_cents')
        .eq('id', clientId)
        .single();

      const { data, error } = await supabase
        .from('onboarding_clients')
        .update({
          status: 'active' as ClientStatus,
          payment_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('onboarding_payments').insert({
        client_id: clientId,
        amount_cents: client?.payment_amount_cents || 0,
        status: 'completed',
      });

      await supabase.from('onboarding_activity_log').insert({
        client_id: clientId,
        action: 'payment_confirmed_manual',
        details: { amount_cents: client?.payment_amount_cents, source: 'admin' },
        actor: 'admin',
      });

      return data as OnboardingClient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      queryClient.invalidateQueries({ queryKey: ['activity', data.id] });
    },
  });
}

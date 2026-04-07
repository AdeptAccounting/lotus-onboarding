'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { OnboardingClient, OnboardingDocument, OnboardingSignature } from '@/types';

const supabase = createClient();

export function usePortalClient(token: string) {
  return useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_clients')
        .select('*')
        .eq('access_token', token)
        .single();
      if (error) throw error;
      return data as OnboardingClient;
    },
    enabled: !!token,
  });
}

export function usePortalDocuments(token: string, documentType?: string) {
  return useQuery({
    queryKey: ['portal-documents', token, documentType],
    queryFn: async () => {
      // First get the client to know service type
      const { data: client } = await supabase
        .from('onboarding_clients')
        .select('service_type')
        .eq('access_token', token)
        .single();

      let query = supabase
        .from('onboarding_documents')
        .select('*')
        .order('sort_order', { ascending: true });

      if (documentType === 'contract') {
        query = query.eq('document_type', 'contract');
        if (client?.service_type) {
          query = query.eq('service_type', client.service_type);
        }
      } else {
        query = query.neq('document_type', 'contract');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OnboardingDocument[];
    },
    enabled: !!token,
  });
}

export function usePortalSignatures(token: string) {
  return useQuery({
    queryKey: ['portal-signatures', token],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('onboarding_clients')
        .select('id')
        .eq('access_token', token)
        .single();

      if (!client) return [];

      const { data, error } = await supabase
        .from('onboarding_signatures')
        .select('*')
        .eq('client_id', client.id);

      if (error) throw error;
      return data as OnboardingSignature[];
    },
    enabled: !!token,
  });
}

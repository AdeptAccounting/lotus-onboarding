'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OnboardingClient, OnboardingDocument, OnboardingSignature, ActivityLogEntry } from '@/types';

function getSupabase() {
  return createClient();
}

export function usePortalClient(token: string) {
  return useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      const { data, error } = await getSupabase()
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
      const { data: client } = await getSupabase()
        .from('onboarding_clients')
        .select('service_type')
        .eq('access_token', token)
        .single();

      let query = getSupabase()
        .from('onboarding_documents')
        .select('*')
        .order('sort_order', { ascending: true });

      if (documentType === 'contract') {
        query = query.eq('document_type', 'contract');
      } else {
        query = query.neq('document_type', 'contract');
      }

      // Filter ALL documents by client's service_type (show matching + universal docs)
      if (client?.service_type) {
        query = query.or(`service_type.eq.${client.service_type},service_type.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OnboardingDocument[];
    },
    enabled: !!token,
  });
}

export function usePortalMessages(token: string) {
  return useQuery({
    queryKey: ['portal-messages', token],
    queryFn: async () => {
      const { data: client } = await getSupabase()
        .from('onboarding_clients')
        .select('id')
        .eq('access_token', token)
        .single();

      if (!client) return [];

      const { data, error } = await getSupabase()
        .from('onboarding_activity_log')
        .select('*')
        .eq('client_id', client.id)
        .eq('action', 'message_sent')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ActivityLogEntry[];
    },
    enabled: !!token,
    refetchInterval: 5000,
  });
}

export function usePortalUploadedDocuments(token: string) {
  return useQuery({
    queryKey: ['portal-uploaded-docs', token],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: client } = await supabase
        .from('onboarding_clients')
        .select('id')
        .eq('access_token', token)
        .single();

      if (!client) return [];

      const { data, error } = await supabase
        .from('onboarding_uploaded_documents')
        .select('*')
        .eq('client_id', client.id)
        .eq('visible_to_client', true)
        .order('uploaded_at', { ascending: false });

      if (error) return [];
      return (data ?? []).map((doc: { file_name: string; storage_path: string; uploaded_at: string }) => ({
        name: doc.file_name,
        url: supabase.storage.from('client-documents').getPublicUrl(doc.storage_path).data.publicUrl,
        createdAt: doc.uploaded_at,
      }));
    },
    enabled: !!token,
  });
}

export function usePortalSignatures(token: string) {
  return useQuery({
    queryKey: ['portal-signatures', token],
    queryFn: async () => {
      const { data: client } = await getSupabase()
        .from('onboarding_clients')
        .select('id')
        .eq('access_token', token)
        .single();

      if (!client) return [];

      const { data, error } = await getSupabase()
        .from('onboarding_signatures')
        .select('*')
        .eq('client_id', client.id);

      if (error) throw error;
      return data as OnboardingSignature[];
    },
    enabled: !!token,
  });
}

export function usePortalSendMessage(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const supabase = getSupabase();
      const { data: client } = await supabase
        .from('onboarding_clients')
        .select('id')
        .eq('access_token', token)
        .single();
      if (!client) throw new Error('Client not found');

      const { data, error } = await supabase
        .from('onboarding_activity_log')
        .insert({
          client_id: client.id,
          action: 'message_sent',
          details: { message },
          actor: 'client',
          read_by_admin: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ActivityLogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages', token] });
    },
  });
}

export function usePortalUploadDocument(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const supabase = getSupabase();
      const { data: client } = await supabase
        .from('onboarding_clients')
        .select('id')
        .eq('access_token', token)
        .single();
      if (!client) throw new Error('Client not found');

      const path = `${client.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('onboarding_uploaded_documents')
        .insert({
          client_id: client.id,
          file_name: file.name,
          storage_path: path,
          visible_to_client: true,
          uploaded_by: 'client',
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-uploaded-docs', token] });
    },
  });
}

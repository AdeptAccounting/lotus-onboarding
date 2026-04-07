'use client';

import { use, useState } from 'react';
import { usePortalClient, usePortalDocuments } from '@/hooks/usePortal';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { SERVICE_TYPE_LABELS } from '@/types';
import { toast } from 'sonner';
import { PenTool, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: client } = usePortalClient(token);
  const { data: documents, isLoading } = usePortalDocuments(token, 'contract');
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  const contract = documents?.[0];

  if (!contract) {
    return (
      <div className="text-center py-20">
        <p className="text-[#6B3A5E] font-medium">Contract not available yet</p>
        <p className="text-sm text-[#8B7080] mt-1">Your contract is being prepared. Please check back soon.</p>
      </div>
    );
  }

  const handleSign = async () => {
    if (!signerName || !agreed) return;

    setSubmitting(true);
    try {
      // Create signature
      await supabase.from('onboarding_signatures').insert({
        client_id: client.id,
        document_id: contract.id,
        signer_name: signerName,
        signed_at: new Date().toISOString(),
      });

      // Update status
      await supabase
        .from('onboarding_clients')
        .update({
          status: 'contract_signed',
          contract_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      await supabase.from('onboarding_activity_log').insert({
        client_id: client.id,
        action: 'contract_signed',
        details: { document: contract.name, service_type: client.service_type },
        actor: 'client',
      });

      queryClient.invalidateQueries({ queryKey: ['portal', token] });
      toast.success('Contract signed!');
      router.push(`/portal/${token}/payment`);
    } catch {
      toast.error('Failed to sign contract');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">
        {client.service_type ? SERVICE_TYPE_LABELS[client.service_type] : ''} Contract
      </h1>
      <p className="text-sm text-[#8B7080] mb-6">
        Please review your service contract carefully and sign below to proceed.
      </p>

      <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
        <div className="p-6 border-b border-[#E8D8E0]">
          <h2 className="text-base font-semibold text-[#6B3A5E] mb-4">{contract.name}</h2>
          <div
            className="prose prose-sm max-w-none text-[#5C4A42] max-h-[500px] overflow-y-auto pr-4
              [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]"
            dangerouslySetInnerHTML={{ __html: contract.html_content }}
          />
        </div>

        <div className="p-6 bg-[#FDF8F5]/50 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#5C4A42] text-sm font-medium">Your Full Legal Name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Type your full legal name"
              className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
            />
          </div>

          {signerName && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-xl bg-white border border-[#E8D8E0]"
            >
              <p className="text-xs text-[#8B7080] mb-1">Signature Preview</p>
              <p className="text-2xl text-[#6B3A5E] italic" style={{ fontFamily: 'Georgia, serif' }}>
                {signerName}
              </p>
              <p className="text-xs text-[#8B7080] mt-2">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </motion.div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-[#E8D8E0] text-[#B5648A] focus:ring-[#B5648A]"
            />
            <span className="text-xs text-[#8B7080] leading-relaxed">
              By checking this box, I acknowledge that I have read and agree to the terms of this contract.
              I consent to use my typed name as my electronic signature in accordance with the E-SIGN Act.
            </span>
          </label>

          <Button
            onClick={handleSign}
            disabled={!signerName || !agreed || submitting}
            className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-2 shadow-lg shadow-[#B5648A]/20"
          >
            <PenTool size={16} />
            {submitting ? 'Signing...' : 'Sign Contract & Proceed to Payment'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

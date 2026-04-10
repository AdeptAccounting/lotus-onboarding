'use client';

import { use, useState, useMemo } from 'react';
import { usePortalClient, usePortalDocuments, usePortalSignatures } from '@/hooks/usePortal';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { SERVICE_TYPE_LABELS } from '@/types';
import { toast } from 'sonner';
import { PenTool, Sparkles, AlertCircle, Check, FlaskConical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import FillableDocument, {
  splitIntoParagraphs,
  parseParagraph,
  propagateDoulaStatus,
} from '@/components/portal/fillable-document';
import { generateAllTestData } from '@/lib/test-data';

export default function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: client } = usePortalClient(token);
  const { data: documents, isLoading } = usePortalDocuments(token, 'contract');
  const { data: portalSignatures } = usePortalSignatures(token);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const contract = documents?.[0];

  // Doula's pre-signature on this contract (Femeika signed before sending).
  // When present, the contract renders her name on the doula signature/date
  // lines instead of the "To be completed by doula" placeholder.
  const doulaSignature = useMemo(() => {
    if (!contract) return null;
    const sig = (portalSignatures ?? []).find(
      (s) => s.document_id === contract.id && s.signer_role === 'doula'
    );
    return sig ? { signer_name: sig.signer_name, signed_at: sig.signed_at } : null;
  }, [portalSignatures, contract]);

  // Compute the set of doula-only field keys so we can exclude them from the
  // "all client fields filled" gate. Must be declared unconditionally to obey
  // React's Rules of Hooks.
  const doulaFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!contract) return keys;
    const paras = splitIntoParagraphs(contract.html_content);
    const kc: Record<string, number> = {};
    const allParsed = paras.map((p) => parseParagraph(p, kc));
    propagateDoulaStatus(allParsed);
    for (const parsed of allParsed) {
      if (parsed.checkboxField?.isDoula) keys.add(parsed.checkboxField.key);
      for (const seg of parsed.segments) {
        if (seg.type === 'field' && seg.field.isDoula) keys.add(seg.field.key);
      }
    }
    return keys;
  }, [contract]);

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-20">
        <p className="text-[#6B3A5E] font-medium">Contract not available yet</p>
        <p className="text-sm text-[#8B7080] mt-1">Your contract is being prepared. Please check back soon.</p>
      </div>
    );
  }

  const clientFieldKeys = Object.keys(formData).filter((k) => !doulaFieldKeys.has(k));
  const hasClientFields = clientFieldKeys.length > 0;
  const allClientFieldsFilled = hasClientFields
    ? clientFieldKeys.every((k) => (formData[k] ?? '').trim() !== '')
    : true;

  const canSign = !!signerName && agreed && (!hasClientFields || allClientFieldsFilled);

  const handleSign = async () => {
    if (!canSign) return;

    setSubmitting(true);
    try {
      // Save filled-in contract field values (if any) so the admin viewer can
      // render them inline alongside the signature, just like intake forms.
      if (hasClientFields) {
        const { error: intakeError } = await supabase.from('onboarding_intake_responses').insert({
          client_id: client.id,
          document_id: contract.id,
          form_data: formData,
          submitted_at: new Date().toISOString(),
        });
        if (intakeError) throw intakeError;
      }

      // Create signature
      const { error: sigError } = await supabase.from('onboarding_signatures').insert({
        client_id: client.id,
        document_id: contract.id,
        signer_name: signerName,
        signer_role: 'client',
        signed_at: new Date().toISOString(),
      });
      if (sigError) throw sigError;

      // Update status
      const { error: updateError } = await supabase
        .from('onboarding_clients')
        .update({
          status: 'contract_signed',
          contract_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);
      if (updateError) throw updateError;

      await supabase.from('onboarding_activity_log').insert({
        client_id: client.id,
        action: 'contract_signed',
        details: { document: contract.name, service_type: client.service_type },
        actor: 'client',
      });

      queryClient.invalidateQueries({ queryKey: ['portal', token] });
      toast.success('Contract signed!');
      router.push(`/portal/${token}/payment`);
    } catch (err) {
      console.error('Contract sign error:', err);
      toast.error('Failed to sign contract. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Test data fill (remove when done testing) ──
  const handleFillTestData = () => {
    if (!contract) return;
    const test = generateAllTestData([contract]);
    setFormData(test.formData[contract.id] ?? {});
    setSignerName(test.signatures[contract.id] ?? 'Jane Doe Test');
    setAgreed(true);
    toast.success('Test data filled');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start justify-between mb-2 gap-4">
        <h1 className="text-xl font-semibold text-[#6B3A5E]">
          {client.service_type ? SERVICE_TYPE_LABELS[client.service_type] : ''} Contract
        </h1>
        {/* Remove this button when done testing */}
        <button
          onClick={handleFillTestData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#B5648A]/10 text-[#B5648A] border border-[#B5648A]/20 hover:bg-[#B5648A]/20 transition-colors shrink-0"
        >
          <FlaskConical size={13} />
          Fill Test Data
        </button>
      </div>
      <p className="text-sm text-[#8B7080] mb-6">
        Please review your service contract carefully, fill in any blank fields, and sign below to proceed.
      </p>

      <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
        <div className="p-6 border-b border-[#E8D8E0]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#6B3A5E]">{contract.name}</h2>
            {contract.has_fillable_fields && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#F5EDF1] text-[#B5648A] font-medium border border-[#E8D8E0]">
                Fill Out Required
              </span>
            )}
          </div>

          <div
            className="max-h-[600px] overflow-y-auto pr-2
              [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]
              [&_img]:mx-auto"
          >
            <FillableDocument
              html_content={contract.html_content}
              document_type={contract.document_type}
              formData={formData}
              onChange={setFormData}
              doulaSignature={doulaSignature}
            />
          </div>

          {hasClientFields && (
            <div className="mt-4">
              {allClientFieldsFilled ? (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                  <Check size={13} />
                  All fields completed
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                  <AlertCircle size={13} />
                  Please fill in all fields above before signing
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-[#FDF8F5]/50 space-y-4">
          {hasClientFields && !allClientFieldsFilled && (
            <div className="p-3 rounded-xl bg-[#F5EDF1] border border-[#E8D8E0] text-xs text-[#8B7080]">
              Complete all form fields above to unlock signing.
            </div>
          )}

          <div
            className={`space-y-1.5 ${
              hasClientFields && !allClientFieldsFilled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Label className="text-[#5C4A42] text-sm font-medium">Your Full Legal Name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Type your full legal name"
              className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
            />
          </div>

          {signerName && (!hasClientFields || allClientFieldsFilled) && (
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

          <label
            className={`flex items-start gap-3 cursor-pointer ${
              hasClientFields && !allClientFieldsFilled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
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
            disabled={!canSign || submitting}
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

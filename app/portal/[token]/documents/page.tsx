'use client';

import { use, useState, useMemo } from 'react';
import { usePortalClient, usePortalDocuments, usePortalSignatures } from '@/hooks/usePortal';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, FileText, PenTool, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function DocumentsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: client } = usePortalClient(token);
  const { data: documents, isLoading } = usePortalDocuments(token, 'packet1');
  const { data: existingSignatures } = usePortalSignatures(token);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const signedDocIds = useMemo(() => {
    return new Set(existingSignatures?.map((s) => s.document_id) || []);
  }, [existingSignatures]);

  if (isLoading || !documents || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  const activeDoc = documents[activeDocIndex];
  const allSigned = documents.every(
    (doc) => signedDocIds.has(doc.id) || (signatures[doc.id] && agreements[doc.id])
  );

  const handleSubmitAll = async () => {
    if (!allSigned) {
      toast.error('Please sign all documents before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Create signature records for newly signed documents
      const newSignatures = documents
        .filter((doc) => !signedDocIds.has(doc.id) && signatures[doc.id])
        .map((doc) => ({
          client_id: client.id,
          document_id: doc.id,
          signer_name: signatures[doc.id],
          signed_at: new Date().toISOString(),
        }));

      if (newSignatures.length > 0) {
        const { error } = await supabase
          .from('onboarding_signatures')
          .insert(newSignatures);
        if (error) throw error;
      }

      // Update client status
      await supabase
        .from('onboarding_clients')
        .update({
          status: 'packet1_submitted',
          packet1_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      // Log activity
      await supabase.from('onboarding_activity_log').insert({
        client_id: client.id,
        action: 'packet1_submitted',
        details: { documents_signed: newSignatures.length },
        actor: 'client',
      });

      // Notify admin
      try {
        await fetch('/api/email/packet-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: client.id }),
        });
      } catch {}

      queryClient.invalidateQueries({ queryKey: ['portal', token] });
      toast.success('Documents submitted successfully!');
      router.push(`/portal/${token}`);
    } catch (err) {
      toast.error('Failed to submit documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">Intake Documents</h1>
        <p className="text-sm text-[#8B7080] mb-6">
          Please review and sign each document below. All documents must be signed to proceed.
        </p>

        {/* Document Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {documents.map((doc, i) => {
            const isSigned = signedDocIds.has(doc.id) || (signatures[doc.id] && agreements[doc.id]);
            const isActive = i === activeDocIndex;

            return (
              <button
                key={doc.id}
                onClick={() => setActiveDocIndex(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#B5648A] text-white shadow-md shadow-[#B5648A]/20'
                    : isSigned
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-white text-[#8B7080] border border-[#E8D8E0] hover:bg-[#F5EDF1]'
                }`}
              >
                {isSigned ? <Check size={14} /> : <FileText size={14} />}
                {doc.name.replace(/Full Spectrum Doula |Death Doula |Doula /g, '')}
              </button>
            );
          })}
        </div>

        {/* Active Document */}
        <AnimatePresence mode="wait">
          {activeDoc && (
            <motion.div
              key={activeDoc.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
                {/* Document Content */}
                <div className="p-6 border-b border-[#E8D8E0]">
                  <h2 className="text-base font-semibold text-[#6B3A5E] mb-4">{activeDoc.name}</h2>
                  <div
                    className="prose prose-sm max-w-none text-[#5C4A42] max-h-[500px] overflow-y-auto pr-4
                      [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]
                      [&_strong]:text-[#5C4A42] [&_li]:text-[#5C4A42]"
                    dangerouslySetInnerHTML={{ __html: activeDoc.html_content }}
                  />
                </div>

                {/* Signature Block */}
                <div className="p-6 bg-[#FDF8F5]/50">
                  {signedDocIds.has(activeDoc.id) ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                      <Check size={18} className="text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Document Signed</p>
                        <p className="text-xs text-green-600">
                          Signed by {existingSignatures?.find((s) => s.document_id === activeDoc.id)?.signer_name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[#5C4A42] text-sm font-medium">Your Full Legal Name</Label>
                        <Input
                          value={signatures[activeDoc.id] || ''}
                          onChange={(e) =>
                            setSignatures((prev) => ({ ...prev, [activeDoc.id]: e.target.value }))
                          }
                          placeholder="Type your full legal name"
                          className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
                        />
                      </div>

                      {signatures[activeDoc.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-4 rounded-xl bg-white border border-[#E8D8E0]"
                        >
                          <p className="text-xs text-[#8B7080] mb-1">Signature Preview</p>
                          <p className="text-2xl text-[#6B3A5E] italic" style={{ fontFamily: 'Georgia, serif' }}>
                            {signatures[activeDoc.id]}
                          </p>
                          <p className="text-xs text-[#8B7080] mt-2">
                            {new Date().toLocaleDateString('en-US', {
                              month: 'long', day: 'numeric', year: 'numeric',
                            })}
                          </p>
                        </motion.div>
                      )}

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreements[activeDoc.id] || false}
                          onChange={(e) =>
                            setAgreements((prev) => ({ ...prev, [activeDoc.id]: e.target.checked }))
                          }
                          className="mt-0.5 rounded border-[#E8D8E0] text-[#B5648A] focus:ring-[#B5648A]"
                        />
                        <span className="text-xs text-[#8B7080] leading-relaxed">
                          By checking this box, I acknowledge that I have read, understand, and agree to the terms
                          outlined in this document. I consent to use my typed name as my electronic signature in
                          accordance with the E-SIGN Act.
                        </span>
                      </label>

                      {signatures[activeDoc.id] && agreements[activeDoc.id] && activeDocIndex < documents.length - 1 && (
                        <Button
                          onClick={() => setActiveDocIndex(activeDocIndex + 1)}
                          variant="outline"
                          className="rounded-xl border-[#E8D8E0] text-[#6B3A5E] hover:bg-[#F5EDF1] gap-2"
                        >
                          Next Document <ChevronRight size={16} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit All */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmitAll}
            disabled={!allSigned || submitting}
            className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white px-8 py-5 text-base shadow-lg shadow-[#B5648A]/20 gap-2 disabled:opacity-50"
          >
            <PenTool size={18} />
            {submitting ? 'Submitting...' : 'Submit All Documents'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

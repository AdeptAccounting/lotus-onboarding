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
import { Check, FileText, PenTool, ChevronRight, Sparkles, AlertCircle, FlaskConical } from 'lucide-react';
import { generateAllTestData } from '@/lib/test-data';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import FillableDocument, { splitIntoParagraphs, parseParagraph, isDoulaField } from '@/components/portal/fillable-document';

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
  // formData[documentId] = { fieldKey: value, ... }
  const [allFormData, setAllFormData] = useState<Record<string, Record<string, string>>>({});
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

  // Build set of doula field keys per document so we can exclude them from completion checks
  const doulaFieldKeys = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    if (!documents) return map;
    for (const doc of documents) {
      const keys = new Set<string>();
      const paras = splitIntoParagraphs(doc.html_content);
      const kc: Record<string, number> = {};
      for (const p of paras) {
        const parsed = parseParagraph(p, kc);
        if (parsed.checkboxField?.isDoula) keys.add(parsed.checkboxField.key);
        for (const seg of parsed.segments) {
          if (seg.type === 'field' && seg.field.isDoula) keys.add(seg.field.key);
        }
      }
      map[doc.id] = keys;
    }
    return map;
  }, [documents]);

  // Check if a document has fillable fields that need completing (excludes doula fields)
  const hasFilledFields = (docId: string): boolean => {
    const docFormData = allFormData[docId];
    if (!docFormData || Object.keys(docFormData).length === 0) return false;
    const doula = doulaFieldKeys[docId] ?? new Set();
    return Object.entries(docFormData)
      .filter(([key]) => !doula.has(key))
      .every(([, v]) => v.trim() !== '');
  };

  // Check if a document has any fillable content (excludes doula fields)
  const hasFillableContent = (docId: string): boolean => {
    const docFormData = allFormData[docId];
    if (!docFormData) return false;
    const doula = doulaFieldKeys[docId] ?? new Set();
    const clientKeys = Object.keys(docFormData).filter((k) => !doula.has(k));
    return clientKeys.length > 0;
  };

  const isDocReady = (docId: string): boolean => {
    if (signedDocIds.has(docId)) return true;
    const hasSig = !!(signatures[docId] && agreements[docId]);
    if (hasFillableContent(docId)) {
      return hasSig && hasFilledFields(docId);
    }
    return hasSig;
  };

  const allSigned = documents.every((doc) => isDocReady(doc.id));

  // ── Test data fill (remove when done testing) ──
  const handleFillTestData = () => {
    if (!documents) return;
    const testData = generateAllTestData(documents);
    setAllFormData(testData.formData);
    setSignatures(testData.signatures);
    setAgreements(testData.agreements);
    toast.success('Test data filled for all documents');
  };

  const handleFormDataChange = (docId: string, data: Record<string, string>) => {
    setAllFormData((prev) => ({ ...prev, [docId]: data }));
  };

  const handleSubmitAll = async () => {
    if (!allSigned) {
      toast.error('Please complete and sign all documents before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Save form responses for all documents with filled fields
      const docsWithFormData = documents.filter(
        (doc) => !signedDocIds.has(doc.id) && allFormData[doc.id] && Object.keys(allFormData[doc.id]).length > 0
      );

      if (docsWithFormData.length > 0) {
        const intakeInserts = docsWithFormData.map((doc) => ({
          client_id: client.id,
          document_id: doc.id,
          form_data: allFormData[doc.id],
          submitted_at: new Date().toISOString(),
        }));

        const { error: intakeError } = await supabase
          .from('onboarding_intake_responses')
          .insert(intakeInserts);
        if (intakeError) {
          console.error('Intake response error:', intakeError);
        }
      }

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
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[#8B7080]">
            Please review and complete each document below. All documents must be filled out and signed to proceed.
          </p>
          {/* Remove this button when done testing */}
          <button
            onClick={handleFillTestData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#B5648A]/10 text-[#B5648A] border border-[#B5648A]/20 hover:bg-[#B5648A]/20 transition-colors shrink-0 ml-4"
          >
            <FlaskConical size={13} />
            Fill Test Data
          </button>
        </div>

        {/* Document Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {documents.map((doc, i) => {
            const done = isDocReady(doc.id);
            const isActive = i === activeDocIndex;

            return (
              <button
                key={doc.id}
                onClick={() => setActiveDocIndex(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#B5648A] text-white shadow-md shadow-[#B5648A]/20'
                    : done
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-white text-[#8B7080] border border-[#E8D8E0] hover:bg-[#F5EDF1]'
                }`}
              >
                {done ? <Check size={14} /> : <FileText size={14} />}
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
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-[#6B3A5E]">{activeDoc.name}</h2>
                    {activeDoc.has_fillable_fields && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#F5EDF1] text-[#B5648A] font-medium border border-[#E8D8E0]">
                        Fill Out Required
                      </span>
                    )}
                  </div>

                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    <FillableDocument
                      html_content={activeDoc.html_content}
                      document_type={activeDoc.document_type}
                      formData={allFormData[activeDoc.id] || {}}
                      onChange={(data) => handleFormDataChange(activeDoc.id, data)}
                    />
                  </div>

                  {/* Form completion indicator */}
                  {hasFillableContent(activeDoc.id) && !signedDocIds.has(activeDoc.id) && (
                    <div className="mt-4">
                      {hasFilledFields(activeDoc.id) ? (
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
                      {/* Fillable form gate */}
                      {hasFillableContent(activeDoc.id) && !hasFilledFields(activeDoc.id) && (
                        <div className="p-3 rounded-xl bg-[#F5EDF1] border border-[#E8D8E0] text-xs text-[#8B7080]">
                          Complete all form fields above to unlock signing.
                        </div>
                      )}

                      <div className={`space-y-1.5 ${hasFillableContent(activeDoc.id) && !hasFilledFields(activeDoc.id) ? 'opacity-50 pointer-events-none' : ''}`}>
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

                      {signatures[activeDoc.id] && (!hasFillableContent(activeDoc.id) || hasFilledFields(activeDoc.id)) && (
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

                      <label className={`flex items-start gap-3 cursor-pointer ${hasFillableContent(activeDoc.id) && !hasFilledFields(activeDoc.id) ? 'opacity-50 pointer-events-none' : ''}`}>
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

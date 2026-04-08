'use client';

import { use, useRef, useState } from 'react';
import { usePortalClient, usePortalSignatures, usePortalUploadedDocuments, usePortalUploadDocument } from '@/hooks/usePortal';
import { Sparkles, FileText, CheckCircle2, Download, Upload, Plus, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DocumentViewerDialog } from '@/components/admin/document-viewer';

export default function PortalDocumentsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: client } = usePortalClient(token);
  const { data: signatures, isLoading: sigsLoading } = usePortalSignatures(token);
  const { data: uploadedDocs, isLoading: docsLoading } = usePortalUploadedDocuments(token);
  const uploadDoc = usePortalUploadDocument(token);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<{
    open: boolean;
    documentId: string;
    signerName: string;
    signedAt: string;
    ipAddress?: string | null;
  }>({ open: false, documentId: '', signerName: '', signedAt: '' });

  if (!client || sigsLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await uploadDoc.mutateAsync(file);
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#6B3A5E]">My Documents</h1>
          <p className="text-sm text-[#8B7080]">Your signed documents and shared files.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] gap-1.5 text-xs h-8"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Signed Onboarding Documents */}
      {signatures && signatures.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#6B3A5E] mb-3">Signed Documents</h2>
          <div className="space-y-3">
            {/* Group by document_id so each doc appears once */}
            {Array.from(
              signatures.reduce((map, sig) => {
                if (!map.has(sig.document_id)) map.set(sig.document_id, []);
                map.get(sig.document_id)!.push(sig);
                return map;
              }, new Map<string, typeof signatures>())
            ).map(([docId, docSigs]) => {
              const firstSig = docSigs[0];
              return (
                <div
                  key={docId}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#5C4A42]">
                        {firstSig.document?.name ?? 'Document'}
                      </p>
                      <p className="text-xs text-[#8B7080]">
                        Signed {new Date(firstSig.signed_at).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewerDoc({
                      open: true,
                      documentId: docId,
                      signerName: firstSig.signer_name,
                      signedAt: firstSig.signed_at,
                      ipAddress: firstSig.ip_address,
                    })}
                    className="ml-4 flex-shrink-0 p-2 rounded-lg text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
                    title="View document"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shared / Uploaded Documents */}
      {uploadedDocs && uploadedDocs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#6B3A5E] mb-3">Shared Documents</h2>
          <div className="space-y-3">
            {uploadedDocs.map((doc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#F5EDF1] flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-[#B5648A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#5C4A42] truncate">
                      {doc.name.replace(/^\d+-/, '')}
                    </p>
                    {doc.createdAt && (
                      <p className="text-xs text-[#8B7080]">
                        {new Date(doc.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 flex-shrink-0 p-2 rounded-lg text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
                >
                  <Download size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!signatures || signatures.length === 0) && (!uploadedDocs || uploadedDocs.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E8D8E0]/50">
          <div className="w-14 h-14 rounded-full bg-[#F5EDF1] flex items-center justify-center mb-3">
            <FileText size={22} className="text-[#B5648A]" />
          </div>
          <p className="text-[#6B3A5E] font-medium">No documents yet</p>
          <p className="text-sm text-[#8B7080] mt-1">Documents will appear here when shared with you.</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 text-sm text-[#B5648A] hover:underline"
          >
            Or upload your own document
          </button>
        </div>
      )}
      {/* Document Viewer */}
      <DocumentViewerDialog
        open={viewerDoc.open}
        onOpenChange={(open) => setViewerDoc((d) => ({ ...d, open }))}
        clientId={client.id}
        documentId={viewerDoc.documentId}
        signerName={viewerDoc.signerName}
        signedAt={viewerDoc.signedAt}
        ipAddress={viewerDoc.ipAddress}
      />
    </motion.div>
  );
}

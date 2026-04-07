'use client';

import { use } from 'react';
import { usePortalClient, usePortalSignatures, usePortalUploadedDocuments } from '@/hooks/usePortal';
import { Sparkles, FileText, CheckCircle2, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PortalDocumentsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: client } = usePortalClient(token);
  const { data: signatures, isLoading: sigsLoading } = usePortalSignatures(token);
  const { data: uploadedDocs, isLoading: docsLoading } = usePortalUploadedDocuments(token);

  if (!client || sigsLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">My Documents</h1>
      <p className="text-sm text-[#8B7080] mb-6">Your signed documents and shared files.</p>

      {/* Signed Onboarding Documents */}
      {signatures && signatures.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#6B3A5E] mb-3">Signed Documents</h2>
          <div className="space-y-3">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5C4A42]">
                      {(sig as unknown as { document?: { name?: string } }).document?.name ?? 'Document'}
                    </p>
                    <p className="text-xs text-[#8B7080]">
                      Signed {new Date(sig.signed_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents */}
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
        </div>
      )}
    </motion.div>
  );
}

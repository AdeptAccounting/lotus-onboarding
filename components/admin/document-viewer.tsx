'use client';

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocument, useIntakeResponse, useClientSignatures } from '@/hooks/useClients';
import { Printer, Loader2, FileText, PenTool } from 'lucide-react';
import {
  splitIntoParagraphs,
  parseParagraph,
  slugify,
} from '@/components/portal/fillable-document';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  documentId: string;
  // Kept for backwards compatibility with call sites; signatures are now fetched internally
  signerName?: string;
  signedAt?: string;
  ipAddress?: string | null;
}

// ─── Read-only rendered document ─────────────────────────────────────────────

const filledSpan = (value: string) =>
  `<span style="border-bottom:1px solid #6B3A5E;padding:0 4px;font-weight:500;color:#6B3A5E">${value}</span>`;

const emptySpan = '<em style="color:#C0A8B4">Not provided</em>';

/** Replace underscores and checkbox symbols in raw HTML with filled values inline. */
function fillHtmlInline(rawHtml: string, formData: Record<string, string>): string {
  const paragraphs = splitIntoParagraphs(rawHtml);
  const keyCounter: Record<string, number> = {};

  const filledParagraphs = paragraphs.map((paraHtml) => {
    const parsed = parseParagraph(paraHtml, keyCounter);

    // Checkbox field (yes/no or multi-choice)
    if (parsed.checkboxField) {
      const field = parsed.checkboxField;
      const value = formData[field.key] || '';
      let html = paraHtml;

      if (field.type === 'yes_no') {
        html = html.replace(/☐\s*Yes/g, value === 'Yes' ? '☑ Yes' : '☐ Yes');
        html = html.replace(/☐\s*No/g, value === 'No' ? '☑ No' : '☐ No');
        return `<p>${html}</p>`;
      }

      // Multi-choice
      const selected = value ? value.split('|') : [];
      const stripped = html.replace(/<[^>]+>/g, '');
      const parts = stripped.split('☐').filter(Boolean);
      parts.forEach((part) => {
        const optionText = part.replace(/_{3,}.*$/, '').replace(/:.*$/, '').trim();
        if (!optionText) return;
        const isSelected = selected.includes(optionText) ||
          selected.some((s) => s.startsWith('Other:') && optionText.toLowerCase() === 'other');
        const otherValue = selected.find((s) => s.startsWith('Other:'));
        let replacement = isSelected ? `☑ ${optionText}` : `☐ ${optionText}`;
        if (optionText.toLowerCase() === 'other' && otherValue) {
          replacement = `☑ Other: ${filledSpan(otherValue.replace('Other:', ''))}`;
        }
        const escapedOption = optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`☐\\s*${escapedOption}`), replacement);
      });
      html = html.replace(/:\s*_{3,}/g, ':');
      return `<p>${html}</p>`;
    }

    // Paragraph with inline text fields — replace each ___ run with corresponding value
    if (parsed.hasFields) {
      let html = paraHtml;
      // Process segments to find field keys, then replace ___ runs in order
      const fieldKeys: string[] = [];
      for (const seg of parsed.segments) {
        if (seg.type === 'field') fieldKeys.push(seg.field.key);
      }

      let fieldIdx = 0;
      html = html.replace(/_{3,}/g, () => {
        const key = fieldKeys[fieldIdx++];
        const value = key ? formData[key] : undefined;
        return value ? filledSpan(value) : emptySpan;
      });
      return `<p>${html}</p>`;
    }

    // Plain paragraph
    return `<p>${paraHtml}</p>`;
  });

  return filledParagraphs.join('');
}

interface SignatureRecord {
  signer_name: string;
  signer_role: 'client' | 'doula';
  signed_at: string;
}

function formatSigDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function makeSigBlock(name: string): string {
  return `<span style="border-bottom:1px solid #6B3A5E;padding:0 4px;font-family:Georgia,serif;font-style:italic;font-size:1.1em;color:#6B3A5E">${name}</span>`;
}

function makeDateBlock(iso: string): string {
  return `<span style="border-bottom:1px solid #6B3A5E;padding:0 4px;color:#6B3A5E">${formatSigDate(iso)}</span>`;
}

/**
 * Place each signature on its appropriate line based on signer_role.
 * Doula sigs land on the first "Doula Signature" line; client sigs land on
 * the first non-doula "Signature" line. Date placeholders following each
 * signature line are filled with that signer's date.
 */
function placeSignatures(html: string, sigs: SignatureRecord[]): string {
  let result = html;
  const doulaSig = sigs.find((s) => s.signer_role === 'doula');
  const clientSig = sigs.find((s) => s.signer_role === 'client');

  // Doula signature first — match labels containing "doula" before "Signature"
  if (doulaSig) {
    const doulaSigRegex = /([A-Za-z\s]*Doula[A-Za-z\s'\u2019]*Signature[^_<]*?)(_{3,})/i;
    const m = result.match(doulaSigRegex);
    if (m) {
      result = result.replace(doulaSigRegex, `$1${makeSigBlock(doulaSig.signer_name)}`);
      // Fill the very next Date underscore run after this point
      const idx = result.indexOf(makeSigBlock(doulaSig.signer_name));
      if (idx >= 0) {
        const after = result.slice(idx);
        const dateMatch = after.match(/(Date[^_<]*?)(_{3,})/i);
        if (dateMatch) {
          const replaced = after.replace(/(Date[^_<]*?)(_{3,})/i, `$1${makeDateBlock(doulaSig.signed_at)}`);
          result = result.slice(0, idx) + replaced;
        }
      }
    }
  }

  // Client signature — match "Client Signature" or first plain "Signature" line that isn't doula
  if (clientSig) {
    const clientSigRegex = /(Client[A-Za-z\s'\u2019]*Signature[^_<]*?)(_{3,})/i;
    let placed = false;
    if (clientSigRegex.test(result)) {
      result = result.replace(clientSigRegex, `$1${makeSigBlock(clientSig.signer_name)}`);
      placed = true;
    } else {
      // Fallback: first remaining "Signature" line that isn't preceded by "Doula"
      const genericSig = /((?<!Doula[\s'\u2019]*)(?:^|[^a-zA-Z])Signature[^_<]*?)(_{3,})/i;
      if (genericSig.test(result)) {
        result = result.replace(genericSig, `$1${makeSigBlock(clientSig.signer_name)}`);
        placed = true;
      }
    }
    if (placed) {
      const idx = result.indexOf(makeSigBlock(clientSig.signer_name));
      if (idx >= 0) {
        const after = result.slice(idx);
        const dateMatch = after.match(/(Date[^_<]*?)(_{3,})/i);
        if (dateMatch) {
          const replaced = after.replace(/(Date[^_<]*?)(_{3,})/i, `$1${makeDateBlock(clientSig.signed_at)}`);
          result = result.slice(0, idx) + replaced;
        }
      }
    }
  }

  return result;
}

function ReadOnlyDocument({
  htmlContent,
  formData,
  signatures,
}: {
  htmlContent: string;
  documentType: string;
  formData: Record<string, string>;
  signatures: SignatureRecord[];
}) {
  // Place signatures FIRST while raw underscores still exist on the signature lines.
  // fillHtmlInline would otherwise replace those underscores with "Not provided" spans.
  const withSigs = signatures.length > 0 ? placeSignatures(htmlContent, signatures) : htmlContent;

  // Then fill the rest of the form data inline
  const hasFormData = Object.keys(formData).length > 0;
  const finalHtml = hasFormData ? fillHtmlInline(withSigs, formData) : withSigs;

  return (
    <div
      className="prose prose-sm max-w-none text-[#5C4A42]
        [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]
        [&_strong]:font-semibold [&_strong]:text-[#5C4A42] [&_li]:text-[#5C4A42]"
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
}

// ─── Main Dialog ─────────────────────────────────────────────────────────────

export function DocumentViewerDialog({
  open,
  onOpenChange,
  clientId,
  documentId,
  ipAddress,
}: DocumentViewerProps) {
  const { data: document, isLoading: docLoading } = useDocument(documentId);
  const { data: intakeResponse, isLoading: responseLoading } = useIntakeResponse(clientId, documentId);
  const { data: allSignatures } = useClientSignatures(clientId);
  const printRef = useRef<HTMLDivElement>(null);

  const isLoading = docLoading || responseLoading;

  // All signatures for this specific document (client + doula)
  const docSignatures: SignatureRecord[] = (allSignatures ?? [])
    .filter((s) => s.document_id === documentId)
    .map((s) => ({
      signer_name: s.signer_name,
      signer_role: (s.signer_role ?? 'client') as 'client' | 'doula',
      signed_at: s.signed_at,
    }));

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document?.name ?? 'Document'}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #333; }
            h1, h2, h3 { color: #6B3A5E; }
            .field-label { font-size: 12px; color: #888; margin-bottom: 2px; }
            .field-value { font-size: 14px; background: #f9f6f4; padding: 6px 12px; border-radius: 6px; border: 1px solid #e8d8e0; margin-bottom: 12px; }
            .badge { display: inline-block; font-size: 12px; padding: 2px 10px; border-radius: 999px; background: #f5edf1; color: #6B3A5E; }
            .signature-block { border-top: 2px solid #E8D8E0; margin-top: 30px; padding-top: 20px; }
            .signature-name { font-size: 18px; font-style: italic; color: #6B3A5E; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const formData = intakeResponse?.form_data ?? {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#6B3A5E]">
            <FileText size={18} className="text-[#B5648A]" />
            {isLoading ? 'Loading...' : document?.name ?? 'Document'}
          </DialogTitle>
          {document && (
            <div className="flex items-center gap-2 mt-1">
              <Badge className="rounded-full text-xs px-2.5 py-0.5 bg-[#F5EDF1] text-[#6B3A5E] border-0">
                {document.document_type === 'intake_form' ? 'Intake Form' :
                 document.document_type === 'contract' ? 'Contract' : 'Legal Notice'}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-[#B5648A] animate-spin" />
          </div>
        ) : document ? (
          <div ref={printRef}>
            <ReadOnlyDocument
              htmlContent={document.html_content}
              documentType={document.document_type}
              formData={formData}
              signatures={docSignatures}
            />

            {/* Signature verification details */}
            {docSignatures.length > 0 && (
              <div className="border-t-2 border-[#E8D8E0] mt-8 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool size={14} className="text-[#B5648A]" />
                  <span className="text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Signature Verification</span>
                </div>
                {docSignatures.map((s, i) => (
                  <p key={i} className="text-xs text-[#8B7080]">
                    Signed by <strong className="text-[#5C4A42]">{s.signer_name}</strong>
                    {s.signer_role === 'doula' ? ' (doula)' : ''} on{' '}
                    {new Date(s.signed_at).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                ))}
                {ipAddress && (
                  <p className="text-xs text-[#C0A8B4] mt-0.5">IP: {ipAddress}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#8B7080] py-8 text-center">Document not found</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-[#E8D8E0] text-[#8B7080]"
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isLoading || !document}
            className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-1.5"
          >
            <Printer size={14} />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

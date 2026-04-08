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
import { useDocument, useIntakeResponse } from '@/hooks/useClients';
import { Printer, Loader2, FileText, PenTool } from 'lucide-react';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  documentId: string;
  signerName: string;
  signedAt: string;
  ipAddress?: string | null;
}

// ─── Field parsing (adapted from FillableDocument) ───────────────────────────

function extractLabel(html: string): string {
  const strongMatch = html.match(/<strong[^>]*>(.*?)<\/strong>/i);
  if (strongMatch) {
    return strongMatch[1].replace(/<[^>]+>/g, '').replace(/[:?]/g, '').trim();
  }
  return html.replace(/<[^>]+>/g, '').replace(/[:?]/g, '').trim().slice(0, 80);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function splitIntoParagraphs(html: string): string[] {
  const normalized = html.replace(/<br\s*\/?>/gi, '\n');
  return normalized
    .split(/<\/p>\s*<p[^>]*>/i)
    .map((block) => block.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim())
    .filter(Boolean);
}

type FieldType = 'text' | 'yes_no' | 'multi_choice' | 'plain';

interface ParsedField {
  type: FieldType;
  label: string;
  key: string;
  rawHtml: string;
}

function parseLine(rawHtml: string, keyCounter: Record<string, number>): ParsedField {
  const stripped = rawHtml.replace(/<[^>]+>/g, '');
  const hasCheckboxes = stripped.includes('☐');
  const hasUnderscores = /_{3,}/.test(stripped);

  const label = extractLabel(rawHtml);
  const baseKey = label ? slugify(label) : 'field';
  const count = keyCounter[baseKey] ?? 0;
  keyCounter[baseKey] = count + 1;
  const key = count === 0 ? baseKey : `${baseKey}_${count}`;

  if (hasCheckboxes) {
    const options = stripped.split('☐').map((s) => s.trim()).filter(Boolean);
    const normalized = options.map((o) => o.replace(/_{3,}.*$/, '').replace(/:.*$/, '').trim().toLowerCase());
    if (normalized.length === 2 && normalized.includes('yes') && normalized.includes('no')) {
      return { type: 'yes_no', label, key, rawHtml };
    }
    return { type: 'multi_choice', label, key, rawHtml };
  }

  if (hasUnderscores && label) {
    return { type: 'text', label, key, rawHtml };
  }

  return { type: 'plain', label, key, rawHtml };
}

// ─── Read-only rendered document ─────────────────────────────────────────────

/** Replace underscores and checkbox symbols in raw HTML with filled values inline. */
function fillHtmlInline(rawHtml: string, formData: Record<string, string>): string {
  const paragraphs = splitIntoParagraphs(rawHtml);
  const keyCounter: Record<string, number> = {};
  const fields = paragraphs.map((p) => parseLine(p, keyCounter));

  const filledParagraphs = fields.map((field) => {
    if (field.type === 'plain') return `<p>${field.rawHtml}</p>`;

    const value = formData[field.key] || '';
    let html = field.rawHtml;

    if (field.type === 'text') {
      // Replace underscores with the filled value styled inline
      const displayValue = value || '<em style="color:#C0A8B4">Not provided</em>';
      html = html.replace(
        /_{3,}/g,
        `<span style="border-bottom:1px solid #6B3A5E;padding:0 4px;font-weight:500;color:#6B3A5E">${displayValue}</span>`
      );
      return `<p>${html}</p>`;
    }

    if (field.type === 'yes_no') {
      // Replace ☐ Yes ☐ No with checked/unchecked indicators
      html = html.replace(/☐\s*Yes/g, value === 'Yes' ? '☑ Yes' : '☐ Yes');
      html = html.replace(/☐\s*No/g, value === 'No' ? '☑ No' : '☐ No');
      return `<p>${html}</p>`;
    }

    if (field.type === 'multi_choice') {
      const selected = value ? value.split('|') : [];
      // Replace each ☐ Option with ☑/☐ based on selection
      const stripped = html.replace(/<[^>]+>/g, '');
      const parts = stripped.split('☐').filter(Boolean);
      parts.forEach((part) => {
        const optionText = part.replace(/_{3,}.*$/, '').replace(/:.*$/, '').trim();
        if (!optionText) return;
        const isSelected = selected.includes(optionText) || selected.some((s) => s.startsWith('Other:') && optionText.toLowerCase() === 'other');
        const otherValue = selected.find((s) => s.startsWith('Other:'));
        let replacement = isSelected ? `☑ ${optionText}` : `☐ ${optionText}`;
        if (optionText.toLowerCase() === 'other' && otherValue) {
          replacement = `☑ Other: <span style="border-bottom:1px solid #6B3A5E;padding:0 4px;color:#6B3A5E">${otherValue.replace('Other:', '')}</span>`;
        }
        // Escape option text for regex
        const escapedOption = optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`☐\\s*${escapedOption}`), replacement);
      });
      // Clean up remaining underscores after "Other:"
      html = html.replace(/:\s*_{3,}/g, ':');
      return `<p>${html}</p>`;
    }

    return `<p>${field.rawHtml}</p>`;
  });

  return filledParagraphs.join('');
}

function ReadOnlyDocument({
  htmlContent,
  formData,
  signerName,
  signedAt,
}: {
  htmlContent: string;
  documentType: string;
  formData: Record<string, string>;
  signerName?: string;
  signedAt?: string;
}) {
  // Fill answers inline for all document types
  const hasFormData = Object.keys(formData).length > 0;
  const filledHtml = hasFormData ? fillHtmlInline(htmlContent, formData) : htmlContent;

  // If there's a signature, append it at the bottom within the document flow
  let finalHtml = filledHtml;
  if (signerName) {
    const signDate = signedAt
      ? new Date(signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';
    // Replace signature underscores if they exist, otherwise append
    const sigBlock = `<span style="border-bottom:1px solid #6B3A5E;padding:0 4px;font-family:Georgia,serif;font-style:italic;font-size:1.1em;color:#6B3A5E">${signerName}</span>`;
    const dateBlock = signDate
      ? `<span style="border-bottom:1px solid #6B3A5E;padding:0 4px;color:#6B3A5E">${signDate}</span>`
      : '';

    // Try replacing signature/date placeholder underscores at the end of the document
    if (/Signature.*_{3,}/i.test(finalHtml)) {
      finalHtml = finalHtml.replace(
        /(Signature[^_]*?)_{3,}/i,
        `$1${sigBlock}`
      );
    }
    if (dateBlock && /Date.*_{3,}/i.test(finalHtml)) {
      finalHtml = finalHtml.replace(
        /(Date[^_]*?)_{3,}/i,
        `$1${dateBlock}`
      );
    }
  }

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
  signerName,
  signedAt,
  ipAddress,
}: DocumentViewerProps) {
  const { data: document, isLoading: docLoading } = useDocument(documentId);
  const { data: intakeResponse, isLoading: responseLoading } = useIntakeResponse(clientId, documentId);
  const printRef = useRef<HTMLDivElement>(null);

  const isLoading = docLoading || responseLoading;

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
              signerName={signerName}
              signedAt={signedAt}
            />

            {/* Signature verification details */}
            <div className="border-t-2 border-[#E8D8E0] mt-8 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <PenTool size={14} className="text-[#B5648A]" />
                <span className="text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Signature Verification</span>
              </div>
              <p className="text-xs text-[#8B7080]">
                Signed by <strong className="text-[#5C4A42]">{signerName}</strong> on{' '}
                {new Date(signedAt).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
              {ipAddress && (
                <p className="text-xs text-[#C0A8B4] mt-0.5">IP: {ipAddress}</p>
              )}
            </div>
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

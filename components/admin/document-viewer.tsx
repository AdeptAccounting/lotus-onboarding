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

function ReadOnlyDocument({
  htmlContent,
  documentType,
  formData,
}: {
  htmlContent: string;
  documentType: string;
  formData: Record<string, string>;
}) {
  if (documentType !== 'intake_form') {
    return (
      <div
        className="prose prose-sm max-w-none text-[#5C4A42]
          [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]
          [&_strong]:text-[#5C4A42] [&_li]:text-[#5C4A42]"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  const paragraphs = splitIntoParagraphs(htmlContent);
  const keyCounter: Record<string, number> = {};
  const fields = paragraphs.map((p) => parseLine(p, keyCounter));

  return (
    <div className="space-y-4">
      {fields.map((field, idx) => {
        if (field.type === 'plain') {
          return (
            <div
              key={idx}
              className="prose prose-sm max-w-none text-[#5C4A42]
                [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]
                [&_strong]:font-semibold [&_strong]:text-[#5C4A42]"
              dangerouslySetInnerHTML={{ __html: field.rawHtml }}
            />
          );
        }

        const value = formData[field.key] || '';

        if (field.type === 'text') {
          return (
            <div key={idx} className="space-y-1">
              <p className="text-xs font-medium text-[#8B7080]">{field.label}</p>
              <p className="text-sm text-[#5C4A42] bg-[#FDF8F5] rounded-lg px-3 py-2 border border-[#E8D8E0]/50">
                {value || <span className="text-[#C0A8B4] italic">Not provided</span>}
              </p>
            </div>
          );
        }

        if (field.type === 'yes_no') {
          return (
            <div key={idx} className="space-y-1">
              <p className="text-xs font-medium text-[#8B7080]">{field.label}</p>
              <p className="text-sm text-[#5C4A42]">
                {value ? (
                  <Badge className={`rounded-full text-xs px-2.5 py-0.5 border-0 ${
                    value === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>{value}</Badge>
                ) : (
                  <span className="text-[#C0A8B4] italic">Not answered</span>
                )}
              </p>
            </div>
          );
        }

        if (field.type === 'multi_choice') {
          const selected = value ? value.split('|') : [];
          return (
            <div key={idx} className="space-y-1">
              <p className="text-xs font-medium text-[#8B7080]">{field.label}</p>
              {selected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((s, i) => (
                    <Badge key={i} className="rounded-full text-xs px-2.5 py-0.5 bg-[#F5EDF1] text-[#6B3A5E] border-0">
                      {s.startsWith('Other:') ? `Other: ${s.replace('Other:', '')}` : s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-[#C0A8B4] italic text-sm">Not answered</span>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
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
            />

            {/* Signature Block */}
            <div className="border-t-2 border-[#E8D8E0] mt-8 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <PenTool size={14} className="text-[#B5648A]" />
                <span className="text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Signature</span>
              </div>
              <p className="text-lg italic text-[#6B3A5E] font-serif mb-1">{signerName}</p>
              <p className="text-xs text-[#8B7080]">
                Signed on {new Date(signedAt).toLocaleDateString('en-US', {
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

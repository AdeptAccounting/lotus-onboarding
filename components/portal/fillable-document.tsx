'use client';

import { useCallback, useId } from 'react';

interface FillableDocumentProps {
  html_content: string;
  document_type: string;
  formData: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}

// Slugify a label string to use as a form field key
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

// Check if a field label/key is a doula-only field
function isDoulaField(label: string): boolean {
  return /doula/i.test(label);
}

// Split HTML into paragraph blocks
function splitIntoParagraphs(html: string): string[] {
  const normalized = html.replace(/<br\s*\/?>/gi, '\n');
  return normalized
    .split(/<\/p>\s*<p[^>]*>/i)
    .map((block) => block.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim())
    .filter(Boolean);
}

/**
 * Parse a paragraph to find individual fields (blanks & checkboxes).
 * A single paragraph like "Client Name ___ Client Signature ___" may contain
 * multiple fields. We split on underscore runs and checkbox symbols to identify them.
 */
interface InlineField {
  type: 'text' | 'yes_no' | 'multi_choice';
  label: string;
  key: string;
  isDoula: boolean;
  options?: string[];
  hasOther?: boolean;
}

interface ParsedParagraph {
  hasFields: boolean;
  // For paragraphs with fields: segments of HTML text and inline field references
  segments: Array<{ type: 'html'; content: string } | { type: 'field'; field: InlineField }>;
  // For checkbox paragraphs: the whole paragraph is one field
  checkboxField?: InlineField;
}

function parseParagraph(rawHtml: string, keyCounter: Record<string, number>): ParsedParagraph {
  const stripped = rawHtml.replace(/<[^>]+>/g, '');
  const hasCheckboxes = stripped.includes('☐');
  const hasUnderscores = /_{3,}/.test(stripped);

  // ── Checkbox fields (yes/no or multi-choice) ──
  if (hasCheckboxes) {
    // Extract the label from <strong> tag or leading text before first ☐
    const strongMatch = rawHtml.match(/<strong[^>]*>(.*?)<\/strong>/i);
    const labelText = strongMatch
      ? strongMatch[1].replace(/<[^>]+>/g, '').replace(/[:?]/g, '').trim()
      : stripped.split('☐')[0].replace(/[:?]/g, '').trim().slice(0, 80);

    const baseKey = labelText ? slugify(labelText) : 'field';
    const count = keyCounter[baseKey] ?? 0;
    keyCounter[baseKey] = count + 1;
    const key = count === 0 ? baseKey : `${baseKey}_${count}`;

    // Extract options
    const parts = stripped.split('☐').map((s) => s.trim()).filter(Boolean);
    // Skip the first part if it's just the label (before any ☐)
    const optionParts = parts.slice(labelText && !stripped.startsWith('☐') ? 0 : 0);
    const options = optionParts
      .map((p) => p.replace(/_{3,}.*$/, '').replace(/:.*$/, '').trim())
      .filter(Boolean);
    // Remove label from options if it snuck in
    const cleanOptions = options.filter((o) => o.toLowerCase() !== labelText.toLowerCase());

    const normalized = cleanOptions.map((o) => o.toLowerCase());
    const isYesNo = normalized.length === 2 && normalized.includes('yes') && normalized.includes('no');

    const hasOther = /Other\s*:\s*_{3,}/i.test(stripped);

    const field: InlineField = {
      type: isYesNo ? 'yes_no' : 'multi_choice',
      label: labelText,
      key,
      isDoula: isDoulaField(labelText),
      options: isYesNo ? undefined : cleanOptions,
      hasOther: isYesNo ? undefined : hasOther,
    };

    return { hasFields: true, segments: [], checkboxField: field };
  }

  // ── Text fields: replace each ___ run with an inline field ──
  if (hasUnderscores) {
    const segments: ParsedParagraph['segments'] = [];
    // Work with the stripped text to find field positions, but keep HTML for display
    // Split the raw HTML on underscore runs
    const htmlParts = rawHtml.split(/_{3,}/);

    if (htmlParts.length <= 1) {
      // No actual splits — treat as plain
      return { hasFields: false, segments: [{ type: 'html', content: rawHtml }] };
    }

    for (let i = 0; i < htmlParts.length; i++) {
      const htmlPart = htmlParts[i];
      if (htmlPart) {
        segments.push({ type: 'html', content: htmlPart });
      }

      // After each part (except the last), insert a field
      if (i < htmlParts.length - 1) {
        // Derive label from the preceding text (strip tags, take last meaningful words)
        const precedingText = htmlPart.replace(/<[^>]+>/g, '').trim();
        // Take the last phrase/label before the blank
        const labelMatch = precedingText.match(/([A-Z][a-zA-Z\s]+?)\s*$/);
        const label = labelMatch ? labelMatch[1].replace(/[:?]/g, '').trim() : `Field ${i + 1}`;

        const baseKey = slugify(label);
        const count = keyCounter[baseKey] ?? 0;
        keyCounter[baseKey] = count + 1;
        const key = count === 0 ? baseKey : `${baseKey}_${count}`;

        segments.push({
          type: 'field',
          field: { type: 'text', label, key, isDoula: isDoulaField(label) },
        });
      }
    }

    return { hasFields: true, segments };
  }

  // ── Plain text paragraph ──
  return { hasFields: false, segments: [{ type: 'html', content: rawHtml }] };
}

// Export parsing for use by test-data.ts and documents page
export { slugify, splitIntoParagraphs, parseParagraph, isDoulaField };
export type { InlineField, ParsedParagraph };

export default function FillableDocument({
  html_content,
  formData,
  onChange,
}: FillableDocumentProps) {
  const uid = useId();

  const handleChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...formData, [key]: value });
    },
    [formData, onChange]
  );

  const paragraphs = splitIntoParagraphs(html_content);
  const keyCounter: Record<string, number> = {};
  const parsed = paragraphs.map((p) => parseParagraph(p, keyCounter));

  return (
    <div className="space-y-4">
      {parsed.map((para, pIdx) => {
        // ── Checkbox field (yes/no or multi-choice) ──
        if (para.checkboxField) {
          const field = para.checkboxField;
          const value = formData[field.key] || '';

          if (field.type === 'yes_no') {
            return (
              <div key={pIdx} className="space-y-2">
                <p className="text-sm text-[#5C4A42]">
                  <strong className="font-semibold">{field.label}</strong>
                </p>
                <div className="flex gap-6">
                  {['Yes', 'No'].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 cursor-pointer text-sm ${
                        field.isDoula ? 'opacity-40 pointer-events-none' : 'text-[#5C4A42]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-${field.key}`}
                        value={option}
                        checked={value === option}
                        onChange={() => handleChange(field.key, option)}
                        disabled={field.isDoula}
                        className="accent-[#B5648A] w-4 h-4"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {field.isDoula && (
                  <p className="text-xs text-[#C0A8B4] italic">To be completed by doula</p>
                )}
              </div>
            );
          }

          // Multi-choice
          const currentValues = value ? value.split('|') : [];
          const toggleOption = (option: string) => {
            const next = currentValues.includes(option)
              ? currentValues.filter((v) => v !== option)
              : [...currentValues, option];
            handleChange(field.key, next.join('|'));
          };

          return (
            <div key={pIdx} className="space-y-2">
              <p className="text-sm text-[#5C4A42]">
                <strong className="font-semibold">{field.label}</strong>
              </p>
              <div className={`flex flex-wrap gap-x-5 gap-y-2 ${field.isDoula ? 'opacity-40 pointer-events-none' : ''}`}>
                {(field.options ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer text-sm text-[#5C4A42]"
                  >
                    <input
                      type="checkbox"
                      checked={currentValues.includes(option)}
                      onChange={() => toggleOption(option)}
                      disabled={field.isDoula}
                      className="accent-[#B5648A] w-4 h-4 rounded"
                    />
                    {option}
                  </label>
                ))}
                {field.hasOther && (
                  <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#5C4A42]">
                      <input
                        type="checkbox"
                        checked={currentValues.some((v) => v.startsWith('Other:'))}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            handleChange(
                              field.key,
                              currentValues.filter((v) => !v.startsWith('Other:')).join('|')
                            );
                          }
                        }}
                        disabled={field.isDoula}
                        className="accent-[#B5648A] w-4 h-4 rounded"
                      />
                      Other:
                    </label>
                    <input
                      value={
                        currentValues
                          .find((v) => v.startsWith('Other:'))
                          ?.replace('Other:', '') || ''
                      }
                      onChange={(e) => {
                        const withoutOther = currentValues.filter((v) => !v.startsWith('Other:'));
                        if (e.target.value) {
                          handleChange(field.key, [...withoutOther, `Other:${e.target.value}`].join('|'));
                        } else {
                          handleChange(field.key, withoutOther.join('|'));
                        }
                      }}
                      placeholder="Please specify"
                      disabled={field.isDoula}
                      className="rounded-xl border border-[#E8D8E0] focus:border-[#B5648A] h-8 text-sm flex-1 px-2 outline-none"
                    />
                  </div>
                )}
              </div>
              {field.isDoula && (
                <p className="text-xs text-[#C0A8B4] italic">To be completed by doula</p>
              )}
            </div>
          );
        }

        // ── Paragraph with inline text fields ──
        if (para.hasFields && para.segments.length > 0) {
          return (
            <div
              key={pIdx}
              className="prose prose-sm max-w-none text-[#5C4A42]
                [&_strong]:font-semibold [&_strong]:text-[#5C4A42]"
            >
              <p className="flex flex-wrap items-baseline gap-y-1">
                {para.segments.map((seg, sIdx) => {
                  if (seg.type === 'html') {
                    return (
                      <span
                        key={sIdx}
                        dangerouslySetInnerHTML={{ __html: seg.content }}
                      />
                    );
                  }

                  // Inline text input replacing the underscores
                  const { field } = seg;
                  return (
                    <span key={sIdx} className="inline-flex items-baseline">
                      {field.isDoula ? (
                        <span
                          className="inline-block min-w-[120px] border-b border-[#E8D8E0] text-xs text-[#C0A8B4] italic px-1 py-0.5 mx-1"
                        >
                          To be completed by doula
                        </span>
                      ) : (
                        <input
                          value={formData[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.label}
                          className="inline-block min-w-[140px] border-b-2 border-[#B5648A]/40 focus:border-[#B5648A]
                            bg-transparent text-sm text-[#5C4A42] px-1 py-0.5 mx-1 outline-none
                            placeholder:text-[#C0A8B4] placeholder:text-xs"
                        />
                      )}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        }

        // ── Plain text paragraph ──
        return (
          <div
            key={pIdx}
            className="prose prose-sm max-w-none text-[#5C4A42]
              [&_h1]:text-[#6B3A5E] [&_h2]:text-[#6B3A5E] [&_h3]:text-[#6B3A5E]
              [&_strong]:font-semibold [&_strong]:text-[#5C4A42]"
            dangerouslySetInnerHTML={{ __html: (para.segments[0]?.type === 'html' ? para.segments[0].content : '') }}
          />
        );
      })}
    </div>
  );
}

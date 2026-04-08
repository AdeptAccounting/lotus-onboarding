'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

// Extract the label text from a line of HTML (content of <strong> tag or leading text)
function extractLabel(html: string): string {
  const strongMatch = html.match(/<strong[^>]*>(.*?)<\/strong>/i);
  if (strongMatch) {
    return strongMatch[1].replace(/<[^>]+>/g, '').replace(/[:?]/g, '').trim();
  }
  // Fallback: strip all tags and take first 80 chars
  return html.replace(/<[^>]+>/g, '').replace(/[:?]/g, '').trim().slice(0, 80);
}

// Detect the checkbox options from a line like "☐ Phone ☐ Email ☐ Text ☐ Other: ___"
function extractCheckboxOptions(html: string): string[] {
  const stripped = html.replace(/<[^>]+>/g, '');
  const parts = stripped.split('☐').map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => {
    // Remove trailing underscores and colons from option labels
    return p.replace(/_{3,}.*$/, '').replace(/:.*$/, '').trim();
  }).filter(Boolean);
}

// Check if a line has an "Other: ___" pattern
function hasOtherField(html: string): boolean {
  return /Other\s*:\s*_{3,}/i.test(html.replace(/<[^>]+>/g, ''));
}

type FieldType = 'text' | 'yes_no' | 'multi_choice' | 'plain';

interface ParsedField {
  type: FieldType;
  label: string;
  key: string;
  options?: string[];
  hasOther?: boolean;
  rawHtml: string;
}

function parseLine(rawHtml: string, keyCounter: Record<string, number>): ParsedField {
  const stripped = rawHtml.replace(/<[^>]+>/g, '');

  const hasCheckboxes = stripped.includes('☐');
  const hasUnderscores = /_{3,}/.test(stripped);

  const label = extractLabel(rawHtml);
  const baseKey = label ? slugify(label) : 'field';

  // Deduplicate keys
  const count = keyCounter[baseKey] ?? 0;
  keyCounter[baseKey] = count + 1;
  const key = count === 0 ? baseKey : `${baseKey}_${count}`;

  if (hasCheckboxes) {
    const options = extractCheckboxOptions(rawHtml);

    // Yes/No detection: exactly ["Yes", "No"] or similar
    const normalized = options.map((o) => o.toLowerCase());
    if (
      normalized.length === 2 &&
      normalized.includes('yes') &&
      normalized.includes('no')
    ) {
      return { type: 'yes_no', label, key, rawHtml };
    }

    return {
      type: 'multi_choice',
      label,
      key,
      options,
      hasOther: hasOtherField(rawHtml),
      rawHtml,
    };
  }

  if (hasUnderscores && label) {
    return { type: 'text', label, key, rawHtml };
  }

  return { type: 'plain', label, key, rawHtml };
}

// Split HTML into paragraph blocks, preserving the raw HTML of each
function splitIntoParagraphs(html: string): string[] {
  // Normalize <br> variants
  const normalized = html.replace(/<br\s*\/?>/gi, '\n');
  // Split on </p><p> and standalone <p> tags
  const blocks = normalized
    .split(/<\/p>\s*<p[^>]*>/i)
    .map((block) => block.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim())
    .filter(Boolean);
  return blocks;
}

export default function FillableDocument({
  html_content,
  document_type,
  formData,
  onChange,
}: FillableDocumentProps) {
  const handleChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...formData, [key]: value });
    },
    [formData, onChange]
  );

  // Parse and render fillable form (all document types go through the parser)
  const paragraphs = splitIntoParagraphs(html_content);
  const keyCounter: Record<string, number> = {};
  const fields = paragraphs.map((p) => parseLine(p, keyCounter));

  return (
    <div className="space-y-5">
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

        if (field.type === 'text') {
          return (
            <div key={idx} className="space-y-1.5">
              <Label className="text-[#5C4A42] text-sm font-medium">{field.label}</Label>
              <Input
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] h-9 text-sm"
              />
            </div>
          );
        }

        if (field.type === 'yes_no') {
          return (
            <div key={idx} className="space-y-2">
              <Label className="text-[#5C4A42] text-sm font-medium">{field.label}</Label>
              <div className="flex gap-6">
                {['Yes', 'No'].map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer text-sm text-[#5C4A42]"
                  >
                    <input
                      type="radio"
                      name={field.key}
                      value={option}
                      checked={formData[field.key] === option}
                      onChange={() => handleChange(field.key, option)}
                      className="accent-[#B5648A] w-4 h-4"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'multi_choice') {
          const currentValues = formData[field.key]
            ? formData[field.key].split('|')
            : [];

          const toggleOption = (option: string) => {
            const next = currentValues.includes(option)
              ? currentValues.filter((v) => v !== option)
              : [...currentValues, option];
            handleChange(field.key, next.join('|'));
          };

          return (
            <div key={idx} className="space-y-2">
              <Label className="text-[#5C4A42] text-sm font-medium">{field.label}</Label>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {(field.options ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer text-sm text-[#5C4A42]"
                  >
                    <input
                      type="checkbox"
                      checked={currentValues.includes(option)}
                      onChange={() => toggleOption(option)}
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
                        className="accent-[#B5648A] w-4 h-4 rounded"
                      />
                      Other:
                    </label>
                    <Input
                      value={
                        currentValues
                          .find((v) => v.startsWith('Other:'))
                          ?.replace('Other:', '') || ''
                      }
                      onChange={(e) => {
                        const withoutOther = currentValues.filter(
                          (v) => !v.startsWith('Other:')
                        );
                        if (e.target.value) {
                          handleChange(
                            field.key,
                            [...withoutOther, `Other:${e.target.value}`].join('|')
                          );
                        } else {
                          handleChange(field.key, withoutOther.join('|'));
                        }
                      }}
                      placeholder="Please specify"
                      className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] h-8 text-sm flex-1"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

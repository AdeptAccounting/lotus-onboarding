/**
 * TEST DATA GENERATOR — Temporary dev utility for filling intake documents.
 * Delete this file (and the button in documents/page.tsx) when testing is complete.
 *
 * Uses parsing from fillable-document.tsx to discover field keys/types.
 */

import {
  splitIntoParagraphs,
  parseParagraph,
  isDoulaField,
  type InlineField,
} from '@/components/portal/fillable-document';

// ── Test value generation ───────────────────────────────────────────

const today = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Pattern-match a field key to return a realistic test value. */
function testValueForTextField(key: string): string {
  const k = key.toLowerCase();

  if (/^(client_name|full_name|legal_name|name)$/.test(k)) return 'Jane Doe';
  if (/partner|spouse/.test(k)) return 'John Doe';
  if (/date_of_birth|dob|birthday/.test(k)) return '01/15/1990';
  if (/due_date|edd|estimated_due/.test(k)) return '09/20/2026';
  if (/address|street/.test(k)) return '123 Main St, Austin, TX 78701';
  if (/^city$/.test(k)) return 'Austin';
  if (/^state$/.test(k)) return 'Texas';
  if (/zip|postal/.test(k)) return '78701';
  if (/phone|cell|mobile|telephone/.test(k)) return '(512) 555-0142';
  if (/email/.test(k)) return 'jane.doe@example.com';
  if (/emergency/.test(k)) return 'John Doe - (512) 555-0199';
  if (/insurance|provider_name|company/.test(k)) return 'Blue Cross Blue Shield';
  if (/policy|member|id_number|group/.test(k)) return 'BCB-123456789';
  if (/occupation|job/.test(k)) return 'Software Engineer';
  if (/employer/.test(k)) return 'Acme Corp';
  if (/allerg/.test(k)) return 'None known';
  if (/medication/.test(k)) return 'Prenatal vitamins';
  if (/blood/.test(k)) return 'O+';
  if (/hospital|birth_center|facility/.test(k)) return "St. David's Medical Center";
  if (/midwife|ob_gyn|doctor|physician|provider/.test(k)) return 'Dr. Sarah Chen';
  if (/referr|how_did_you/.test(k)) return 'Friend recommendation';
  if (/gravida|pregnancies|number_of_preg/.test(k)) return '1';
  if (/para|number_of_birth|live_birth/.test(k)) return '0';
  if (/weight/.test(k)) return '145 lbs';
  if (/height/.test(k)) return '5\'6"';
  if (/ssn|social_security/.test(k)) return '000-00-0000';
  if (/reason|concern|goal|hope|expect|wish|fear|worry/.test(k))
    return 'Looking forward to a supported and informed birth experience.';
  if (/note|comment|additional|other_info|detail|description|explain/.test(k))
    return 'No additional notes at this time.';
  if (/date|today/.test(k)) return today();
  if (/signature/.test(k)) return 'Jane Doe';

  return 'Test response';
}

function testValueForField(field: InlineField): string {
  if (field.type === 'yes_no') return 'Yes';

  if (field.type === 'multi_choice') {
    const opts = field.options ?? [];
    if (opts.length === 0) return '';
    return opts.length >= 3 ? `${opts[0]}|${opts[1]}` : opts[0];
  }

  if (field.type === 'text') return testValueForTextField(field.key);

  return '';
}

// ── Main export ─────────────────────────────────────────────────────

interface DocumentInput {
  id: string;
  html_content: string;
}

export function generateAllTestData(documents: DocumentInput[]): {
  formData: Record<string, Record<string, string>>;
  signatures: Record<string, string>;
  agreements: Record<string, boolean>;
} {
  const formData: Record<string, Record<string, string>> = {};
  const signatures: Record<string, string> = {};
  const agreements: Record<string, boolean> = {};

  for (const doc of documents) {
    const paragraphs = splitIntoParagraphs(doc.html_content);
    const keyCounter: Record<string, number> = {};
    const parsed = paragraphs.map((p) => parseParagraph(p, keyCounter));

    const docForm: Record<string, string> = {};

    for (const para of parsed) {
      // Checkbox fields
      if (para.checkboxField) {
        const field = para.checkboxField;
        if (field.isDoula) continue; // Skip doula fields
        const value = testValueForField(field);
        if (value) docForm[field.key] = value;
        continue;
      }

      // Inline text fields
      for (const seg of para.segments) {
        if (seg.type !== 'field') continue;
        if (seg.field.isDoula) continue; // Skip doula fields
        const value = testValueForField(seg.field);
        if (value) docForm[seg.field.key] = value;
      }
    }

    formData[doc.id] = docForm;
    signatures[doc.id] = 'Jane Doe Test';
    agreements[doc.id] = true;
  }

  return { formData, signatures, agreements };
}

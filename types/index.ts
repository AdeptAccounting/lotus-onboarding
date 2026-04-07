export type ClientStatus =
  | 'new_lead'
  | 'packet1_sent'
  | 'packet1_submitted'
  | 'packet1_approved'
  | 'contract_sent'
  | 'contract_signed'
  | 'payment_pending'
  | 'active'
  | 'archived';

export type ServiceType = 'birth_doula' | 'postpartum_doula' | 'death_doula';

export type DocumentType = 'intake_form' | 'legal_notice' | 'contract';

export interface OnboardingClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  due_date: string | null;
  address: string | null;
  emergency_contact: string | null;
  notes: string | null;
  service_type: ServiceType | null;
  status: ClientStatus;
  access_token: string;
  payment_amount_cents: number | null;
  packet1_sent_at: string | null;
  packet1_submitted_at: string | null;
  packet1_approved_at: string | null;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  payment_completed_at: string | null;
  square_payment_id: string | null;
  payment_link_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingDocument {
  id: string;
  name: string;
  slug: string;
  document_type: DocumentType;
  service_type: ServiceType | null;
  html_content: string;
  has_fillable_fields: boolean;
  requires_signature: boolean;
  sort_order: number;
  created_at: string;
}

export interface OnboardingSignature {
  id: string;
  client_id: string;
  document_id: string;
  signer_name: string;
  signature_image: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
}

export interface OnboardingIntakeResponse {
  id: string;
  client_id: string;
  document_id: string;
  form_data: Record<string, string>;
  submitted_at: string;
}

export interface OnboardingPayment {
  id: string;
  client_id: string;
  square_payment_id: string | null;
  amount_cents: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  receipt_url: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  client_id: string;
  action: string;
  details: Record<string, unknown> | null;
  actor: 'admin' | 'client';
  created_at: string;
}

export interface UploadedDocument {
  id: string;
  client_id: string;
  file_name: string;
  storage_path: string;
  visible_to_client: boolean;
  uploaded_by: 'admin' | 'client';
  uploaded_at: string;
}

export interface OnboardingSettings {
  id: string;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  square_access_token: string | null;
  square_refresh_token: string | null;
  square_location_id: string | null;
  square_environment: string;
  notification_email: string | null;
  business_name: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<ClientStatus, string> = {
  new_lead: 'New Lead',
  packet1_sent: 'Packet 1 Sent',
  packet1_submitted: 'Packet 1 Submitted',
  packet1_approved: 'Packet 1 Approved',
  contract_sent: 'Contract Sent',
  contract_signed: 'Contract Signed',
  payment_pending: 'Payment Pending',
  active: 'Active',
  archived: 'Archived',
};

export const STATUS_COLORS: Record<ClientStatus, string> = {
  new_lead: 'bg-blue-100 text-blue-800',
  packet1_sent: 'bg-yellow-100 text-yellow-800',
  packet1_submitted: 'bg-purple-100 text-purple-800',
  packet1_approved: 'bg-indigo-100 text-indigo-800',
  contract_sent: 'bg-orange-100 text-orange-800',
  contract_signed: 'bg-teal-100 text-teal-800',
  payment_pending: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  birth_doula: 'Birth Doula',
  postpartum_doula: 'Postpartum Doula',
  death_doula: 'Death Doula',
};

export const PIPELINE_STEPS: { status: ClientStatus; label: string }[] = [
  { status: 'new_lead', label: 'New Lead' },
  { status: 'packet1_sent', label: 'Packet 1 Sent' },
  { status: 'packet1_submitted', label: 'Submitted' },
  { status: 'packet1_approved', label: 'Approved' },
  { status: 'contract_sent', label: 'Contract Sent' },
  { status: 'contract_signed', label: 'Signed' },
  { status: 'payment_pending', label: 'Payment' },
  { status: 'active', label: 'Active' },
];

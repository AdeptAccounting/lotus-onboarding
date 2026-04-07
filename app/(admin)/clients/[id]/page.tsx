'use client';

import { use, useState, useRef } from 'react';
import {
  useClient,
  useClientSignatures,
  useClientActivity,
  useApprovePacket1,
  useSendContract,
  useUpdateClient,
  useConfirmPayment,
  useAddNote,
  useDeleteNote,
  useAddMessage,
  useDeleteMessage,
  useSavePaymentLink,
  useUploadedDocuments,
  useToggleDocumentVisibility,
  useMarkMessagesRead,
} from '@/hooks/useClients';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { PipelineStepper } from '@/components/admin/pipeline-stepper';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  FileText,
  User,
  DollarSign,
  Heart,
  Baby,
  Flower2,
  CreditCard,
  Edit2,
  X,
  Save,
  StickyNote,
  Upload,
  Trash2,
  Download,
  Plus,
  Eye,
  EyeOff,
  Bell,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { NotifyClientDialog } from '@/components/admin/notify-client-dialog';
import { DocumentViewerDialog } from '@/components/admin/document-viewer';

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  birth_doula: <Baby size={20} />,
  postpartum_doula: <Heart size={20} />,
  death_doula: <Flower2 size={20} />,
};

type TabId = 'info' | 'documents' | 'notes' | 'messages';

// ─── Editable Client Info ─────────────────────────────────────────────────────

function EditableClientInfo({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  const updateClient = useUpdateClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    address: '',
    date_of_birth: '',
    due_date: '',
    emergency_contact: '',
    notes: '',
  });

  if (!client) return null;

  const startEdit = () => {
    setForm({
      phone: client.phone ?? '',
      address: client.address ?? '',
      date_of_birth: client.date_of_birth ?? '',
      due_date: client.due_date ?? '',
      emergency_contact: client.emergency_contact ?? '',
      notes: client.notes ?? '',
    });
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        phone: form.phone || null,
        address: form.address || null,
        date_of_birth: form.date_of_birth || null,
        due_date: form.due_date || null,
        emergency_contact: form.emergency_contact || null,
        notes: form.notes || null,
      });
      toast.success('Client info updated');
      setEditing(false);
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <p className="text-xs text-[#8B7080] mb-1">{label}</p>
      {editing ? (
        <Input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] text-sm h-9"
        />
      ) : (
        <p className="text-sm text-[#5C4A42]">
          {(client[key as keyof typeof client] as string) ?? <span className="text-[#C0A8B4] italic">Not set</span>}
        </p>
      )}
    </div>
  );

  return (
    <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
            <User size={16} />
            Client Info
          </CardTitle>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={startEdit}
              className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] gap-1.5 text-xs h-8"
            >
              <Edit2 size={13} />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancel}
                className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] gap-1 text-xs h-8"
              >
                <X size={13} />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={updateClient.isPending}
                className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-1 text-xs h-8"
              >
                <Save size={13} />
                {updateClient.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-[#8B7080]">Email</p>
          <p className="text-sm text-[#5C4A42]">{client.email}</p>
        </div>
        {field('Phone', 'phone', 'tel')}
        {field('Address', 'address')}
        {field('Date of Birth', 'date_of_birth', 'date')}
        {field('Due Date', 'due_date', 'date')}
        {field('Emergency Contact', 'emergency_contact')}
        {field('Notes', 'notes')}
        <div>
          <p className="text-xs text-[#8B7080]">Added</p>
          <p className="text-sm text-[#5C4A42]">
            {new Date(client.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Active Client Full Profile ───────────────────────────────────────────────

function ActiveClientProfile({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  const { data: signatures } = useClientSignatures(clientId);
  const { data: activity } = useClientActivity(clientId);
  const updateClient = useUpdateClient();
  const addNote = useAddNote(clientId);
  const deleteNote = useDeleteNote();
  const addMessage = useAddMessage(clientId);
  const deleteMessage = useDeleteMessage();
  const { data: uploadedDocs } = useUploadedDocuments(clientId);
  const toggleVisibility = useToggleDocumentVisibility();

  const [activeTab, setActiveTab] = useState<TabId>('info');

  // Info tab edit state
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    phone: '',
    address: '',
    date_of_birth: '',
    emergency_contact: '',
  });
  const [editingService, setEditingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    due_date: '',
  });

  // Notes tab state
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Messages tab state
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [notifyDialog, setNotifyDialog] = useState<{
    open: boolean;
    updateType: 'message' | 'document' | 'payment_link';
    preview?: string;
  }>({ open: false, updateType: 'message' });

  // Documents tab state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Document viewer state
  const [viewerDoc, setViewerDoc] = useState<{
    open: boolean;
    documentId: string;
    signerName: string;
    signedAt: string;
    ipAddress?: string | null;
  }>({ open: false, documentId: '', signerName: '', signedAt: '' });

  if (!client) return null;

  const notes = activity?.filter((e) => e.action === 'note_added') ?? [];
  const messages = activity?.filter((e) => e.action === 'message_sent') ?? [];

  // Personal info handlers
  const startPersonalEdit = () => {
    setPersonalForm({
      phone: client.phone ?? '',
      address: client.address ?? '',
      date_of_birth: client.date_of_birth ?? '',
      emergency_contact: client.emergency_contact ?? '',
    });
    setEditingPersonal(true);
  };

  const savePersonal = async () => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        phone: personalForm.phone || null,
        address: personalForm.address || null,
        date_of_birth: personalForm.date_of_birth || null,
        emergency_contact: personalForm.emergency_contact || null,
      });
      toast.success('Personal info updated');
      setEditingPersonal(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const startServiceEdit = () => {
    setServiceForm({ due_date: client.due_date ?? '' });
    setEditingService(true);
  };

  const saveService = async () => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        due_date: serviceForm.due_date || null,
      });
      toast.success('Service info updated');
      setEditingService(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  // Notes handlers
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote.mutateAsync(noteText.trim());
      toast.success('Note added');
      setNoteText('');
      setNoteOpen(false);
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync({ noteId, clientId });
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  // Message handlers
  const handleAddMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await addMessage.mutateAsync(messageText.trim());
      toast.success('Message sent');
      const preview = messageText.trim().slice(0, 100);
      setMessageText('');
      setMessageOpen(false);
      setNotifyDialog({ open: true, updateType: 'message', preview });
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync({ messageId, clientId });
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  // Document upload
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createSupabaseClient();
      const path = `${clientId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('client-documents')
        .upload(path, file);
      if (error) {
        if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
          setStorageError('Document uploads coming soon — storage bucket not yet configured.');
        } else {
          throw error;
        }
        return;
      }
      // Persist to DB
      await supabase.from('onboarding_uploaded_documents').insert({
        client_id: clientId,
        file_name: file.name,
        storage_path: path,
        visible_to_client: false,
      });
      toast.success('Document uploaded');
      setNotifyDialog({ open: true, updateType: 'document', preview: file.name });
    } catch (err) {
      toast.error('Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'documents', label: 'Documents' },
    { id: 'notes', label: `Notes${notes.length > 0 ? ` (${notes.length})` : ''}` },
    { id: 'messages', label: `Messages${messages.length > 0 ? ` (${messages.length})` : ''}` },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#B5648A]/10 to-[#9B4D73]/10 text-[#6B3A5E] shadow-sm'
                : 'text-[#8B7080] hover:text-[#6B3A5E]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── INFO TAB ── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Info */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#6B3A5E] text-base">Personal Info</CardTitle>
                {!editingPersonal ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startPersonalEdit}
                    className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] gap-1.5 text-xs h-8"
                  >
                    <Edit2 size={13} />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPersonal(false)}
                      className="rounded-xl border-[#E8D8E0] text-[#8B7080] gap-1 text-xs h-8"
                    >
                      <X size={13} />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={savePersonal}
                      disabled={updateClient.isPending}
                      className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-1 text-xs h-8"
                    >
                      <Save size={13} />
                      {updateClient.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Name', value: `${client.first_name} ${client.last_name}`, readOnly: true },
                { label: 'Email', value: client.email, readOnly: true },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-[#8B7080] mb-0.5">{label}</p>
                  <p className="text-sm text-[#5C4A42]">{value}</p>
                </div>
              ))}

              {(
                [
                  { label: 'Phone', key: 'phone' as const, type: 'tel' },
                  { label: 'Address', key: 'address' as const },
                  { label: 'Date of Birth', key: 'date_of_birth' as const, type: 'date' },
                  { label: 'Emergency Contact', key: 'emergency_contact' as const },
                ] as { label: string; key: keyof typeof personalForm; type?: string }[]
              ).map(({ label, key, type = 'text' }) => (
                <div key={key}>
                  <p className="text-xs text-[#8B7080] mb-1">{label}</p>
                  {editingPersonal ? (
                    <Input
                      type={type}
                      value={personalForm[key]}
                      onChange={(e) =>
                        setPersonalForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] text-sm h-9"
                    />
                  ) : (
                    <p className="text-sm text-[#5C4A42]">
                      {(client[key as keyof typeof client] as string | null) ?? (
                        <span className="text-[#C0A8B4] italic">Not set</span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Service Info */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#6B3A5E] text-base">Service Info</CardTitle>
                {!editingService ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startServiceEdit}
                    className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] gap-1.5 text-xs h-8"
                  >
                    <Edit2 size={13} />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingService(false)}
                      className="rounded-xl border-[#E8D8E0] text-[#8B7080] gap-1 text-xs h-8"
                    >
                      <X size={13} />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveService}
                      disabled={updateClient.isPending}
                      className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-1 text-xs h-8"
                    >
                      <Save size={13} />
                      {updateClient.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-[#8B7080] mb-0.5">Service Type</p>
                <p className="text-sm text-[#5C4A42]">
                  {client.service_type
                    ? SERVICE_TYPE_LABELS[client.service_type]
                    : <span className="text-[#C0A8B4] italic">Not set</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8B7080] mb-0.5">Payment Amount</p>
                <p className="text-sm text-[#5C4A42]">
                  {client.payment_amount_cents
                    ? `$${(client.payment_amount_cents / 100).toFixed(2)}`
                    : <span className="text-[#C0A8B4] italic">Not set</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8B7080] mb-1">Due Date</p>
                {editingService ? (
                  <Input
                    type="date"
                    value={serviceForm.due_date}
                    onChange={(e) =>
                      setServiceForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                    className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] text-sm h-9"
                  />
                ) : (
                  <p className="text-sm text-[#5C4A42]">
                    {client.due_date
                      ? new Date(client.due_date).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })
                      : <span className="text-[#C0A8B4] italic">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#8B7080] mb-0.5">Onboarding Completed</p>
                <p className="text-sm text-[#5C4A42]">
                  {client.payment_completed_at
                    ? new Date(client.payment_completed_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })
                    : <span className="text-[#C0A8B4] italic">—</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8B7080] mb-0.5">Client Since</p>
                <p className="text-sm text-[#5C4A42]">
                  {new Date(client.created_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Signed Onboarding Documents */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                <FileText size={16} />
                Signed Onboarding Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!signatures || signatures.length === 0 ? (
                <p className="text-sm text-[#8B7080] py-4 text-center">No signed documents yet</p>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#5C4A42]">{sig.document?.name}</p>
                          <p className="text-xs text-[#8B7080]">Signed by {sig.signer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <p className="text-xs text-[#8B7080]">
                          {new Date(sig.signed_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                        <button
                          onClick={() => setViewerDoc({ open: true, documentId: sig.document_id, signerName: sig.signer_name, signedAt: sig.signed_at, ipAddress: sig.ip_address })}
                          className="p-2 rounded-lg text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Documents */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                  <Upload size={16} />
                  Uploaded Documents
                </CardTitle>
                {!storageError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] gap-1.5 text-xs h-8"
                  >
                    <Plus size={13} />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                )}
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
            </CardHeader>
            <CardContent>
              {storageError ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  {storageError}
                </div>
              ) : !uploadedDocs || uploadedDocs.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-[#E8D8E0] rounded-xl cursor-pointer hover:border-[#B5648A]/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={20} className="text-[#8B7080] mb-2" />
                  <p className="text-sm text-[#8B7080]">Click to upload a document</p>
                  <p className="text-xs text-[#C0A8B4] mt-1">PDF, images, Word documents</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedDocs.map((doc) => {
                    const supabase = createSupabaseClient();
                    const url = supabase.storage.from('client-documents').getPublicUrl(doc.storage_path).data.publicUrl;
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#F5EDF1] flex items-center justify-center flex-shrink-0">
                            <FileText size={14} className="text-[#B5648A]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#5C4A42] truncate">{doc.file_name}</p>
                            <p className="text-xs text-[#8B7080]">
                              {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                          <button
                            onClick={() => toggleVisibility.mutate({ docId: doc.id, visible: !doc.visible_to_client, clientId })}
                            className={`p-2 rounded-lg transition-colors ${
                              doc.visible_to_client
                                ? 'text-[#B5648A] hover:bg-[#F5EDF1]'
                                : 'text-[#C0A8B4] hover:bg-[#F5EDF1] hover:text-[#8B7080]'
                            }`}
                            title={doc.visible_to_client ? 'Visible to client — click to hide' : 'Hidden from client — click to share'}
                          >
                            {doc.visible_to_client ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 py-1.5 text-xs text-[#8B7080] bg-amber-50/50 border border-amber-100 rounded-xl px-3">
            <StickyNote size={13} className="text-amber-500 flex-shrink-0" />
            Private notes — only visible to you
          </div>
          {/* Add Note */}
          <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm p-5">
            {!noteOpen ? (
              <button
                onClick={() => setNoteOpen(true)}
                className="flex items-center gap-2 text-sm text-[#8B7080] hover:text-[#6B3A5E] transition-colors"
              >
                <Plus size={16} className="text-[#B5648A]" />
                Add a note
              </button>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note about this client..."
                  rows={4}
                  className="w-full rounded-xl border border-[#E8D8E0] bg-[#FDF8F5] px-3 py-2.5 text-sm text-[#5C4A42] placeholder:text-[#C0A8B4] focus:outline-none focus:border-[#B5648A] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setNoteOpen(false); setNoteText(''); }}
                    className="rounded-xl border-[#E8D8E0] text-[#8B7080] text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || addNote.isPending}
                    className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white text-xs h-8"
                  >
                    {addNote.isPending ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#E8D8E0]/50">
              <div className="w-14 h-14 rounded-full bg-[#F5EDF1] flex items-center justify-center mb-3">
                <StickyNote size={20} className="text-[#B5648A]" />
              </div>
              <p className="text-[#6B3A5E] font-medium text-sm">No notes yet</p>
              <p className="text-xs text-[#8B7080] mt-1">Add a note to track important details</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-[#5C4A42] leading-relaxed whitespace-pre-wrap">
                        {(note.details as { note?: string })?.note ?? ''}
                      </p>
                      <p className="text-xs text-[#8B7080] mt-2">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-lg text-[#C0A8B4] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES TAB ── */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8B7080] bg-blue-50/50 border border-blue-100 rounded-xl">
            <Send size={13} className="text-blue-500 flex-shrink-0" />
            Messages are visible to the client in their portal
          </div>

          {/* Add Message */}
          <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm p-5">
            {!messageOpen ? (
              <button
                onClick={() => setMessageOpen(true)}
                className="flex items-center gap-2 text-sm text-[#8B7080] hover:text-[#6B3A5E] transition-colors"
              >
                <Plus size={16} className="text-[#B5648A]" />
                Write a message
              </button>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a message to the client... (they will see this in their portal)"
                  rows={4}
                  className="w-full rounded-xl border border-[#E8D8E0] bg-[#FDF8F5] px-3 py-2.5 text-sm text-[#5C4A42] placeholder:text-[#C0A8B4] focus:outline-none focus:border-[#B5648A] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setMessageOpen(false); setMessageText(''); }}
                    className="rounded-xl border-[#E8D8E0] text-[#8B7080] text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddMessage}
                    disabled={!messageText.trim() || addMessage.isPending}
                    className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white text-xs h-8 gap-1"
                  >
                    <Send size={12} />
                    {addMessage.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Messages List */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#E8D8E0]/50">
              <div className="w-14 h-14 rounded-full bg-[#F5EDF1] flex items-center justify-center mb-3">
                <Send size={20} className="text-[#B5648A]" />
              </div>
              <p className="text-[#6B3A5E] font-medium text-sm">No messages yet</p>
              <p className="text-xs text-[#8B7080] mt-1">Send a message to the client</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-[#5C4A42] leading-relaxed whitespace-pre-wrap">
                        {(msg.details as { message?: string })?.message ?? ''}
                      </p>
                      <p className="text-xs text-[#8B7080] mt-2">
                        {new Date(msg.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 rounded-lg text-[#C0A8B4] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notify Client Dialog */}
      <NotifyClientDialog
        open={notifyDialog.open}
        onOpenChange={(open) => setNotifyDialog((d) => ({ ...d, open }))}
        clientId={clientId}
        clientName={`${client.first_name} ${client.last_name}`}
        updateType={notifyDialog.updateType}
        preview={notifyDialog.preview}
      />

      {/* Document Viewer */}
      <DocumentViewerDialog
        open={viewerDoc.open}
        onOpenChange={(open) => setViewerDoc((d) => ({ ...d, open }))}
        clientId={clientId}
        documentId={viewerDoc.documentId}
        signerName={viewerDoc.signerName}
        signedAt={viewerDoc.signedAt}
        ipAddress={viewerDoc.ipAddress}
      />
    </div>
  );
}

// ─── Pipeline View (non-active clients) ──────────────────────────────────────

function PipelineClientView({ client, clientId }: { client: NonNullable<ReturnType<typeof useClient>['data']>; clientId: string }) {
  const { data: signatures } = useClientSignatures(clientId);
  const { data: activity } = useClientActivity(clientId);
  const approvePacket1 = useApprovePacket1();
  const sendContract = useSendContract();
  const confirmPayment = useConfirmPayment();
  const updateClient = useUpdateClient();
  const savePaymentLink = useSavePaymentLink();
  const addNote = useAddNote(clientId);
  const deleteNote = useDeleteNote();
  const addMessage = useAddMessage(clientId);
  const deleteMessage = useDeleteMessage();
  const markRead = useMarkMessagesRead(clientId);
  const { data: uploadedDocs } = useUploadedDocuments(clientId);
  const toggleVisibility = useToggleDocumentVisibility();

  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(client.payment_link_url ?? '');
  const [paymentLinkSaving, setPaymentLinkSaving] = useState(false);

  // Notes & Messages state
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [notifyDialog, setNotifyDialog] = useState<{
    open: boolean;
    updateType: 'message' | 'document' | 'payment_link';
    preview?: string;
  }>({ open: false, updateType: 'message' });

  // Documents state
  const pipelineFileRef = useRef<HTMLInputElement>(null);
  const [pipelineUploading, setPipelineUploading] = useState(false);
  const [pipelineStorageError, setPipelineStorageError] = useState<string | null>(null);

  // Activity collapse state
  const [activityOpen, setActivityOpen] = useState(false);

  // Document viewer state
  const [viewerDoc, setViewerDoc] = useState<{
    open: boolean;
    documentId: string;
    signerName: string;
    signedAt: string;
    ipAddress?: string | null;
  }>({ open: false, documentId: '', signerName: '', signedAt: '' });

  const handlePipelineUpload = async (file: File) => {
    setPipelineUploading(true);
    try {
      const supabase = createSupabaseClient();
      const path = `${clientId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('client-documents').upload(path, file);
      if (error) {
        if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
          setPipelineStorageError('Document uploads coming soon — storage bucket not yet configured.');
        } else {
          throw error;
        }
        return;
      }
      await supabase.from('onboarding_uploaded_documents').insert({
        client_id: clientId,
        file_name: file.name,
        storage_path: path,
        visible_to_client: false,
      });
      toast.success('Document uploaded');
      setNotifyDialog({ open: true, updateType: 'document', preview: file.name });
    } catch (err) {
      toast.error('Upload failed');
      console.error(err);
    } finally {
      setPipelineUploading(false);
    }
  };

  // Send Reminder state
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const handleSendReminder = async () => {
    setReminderSending(true);
    try {
      const res = await fetch('/api/email/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Reminder sent to ${client.email}`);
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
    } catch {
      toast.error('Failed to send reminder');
    } finally {
      setReminderSending(false);
    }
  };

  const handleApprove = async () => {
    try {
      await approvePacket1.mutateAsync(client.id);
      toast.success('Packet 1 approved!');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleSendContract = async () => {
    if (!selectedService || !paymentAmount) {
      toast.error('Please select a service type and enter the payment amount');
      return;
    }
    try {
      await sendContract.mutateAsync({
        clientId: client.id,
        serviceType: selectedService,
        paymentAmountCents: Math.round(parseFloat(paymentAmount) * 100),
      });
      toast.success('Contract sent!', {
        description: `${SERVICE_TYPE_LABELS[selectedService]} contract sent to ${client.email}`,
      });
    } catch {
      toast.error('Failed to send contract');
    }
  };

  const portalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/portal/${client.access_token}`
      : '';

  return (
    <div className="space-y-6">
      {/* Pipeline Stepper */}
      <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
        <CardContent className="pt-6 pb-4">
          <PipelineStepper currentStatus={client.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {client.status === 'packet1_submitted' && (
            <Card className="rounded-2xl border-purple-200 bg-purple-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                  <FileText size={18} className="text-purple-600" />
                  Packet 1 Ready for Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8B7080] mb-4">
                  {client.first_name} has signed all intake documents. Review and approve to proceed.
                </p>
                {signatures && signatures.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {signatures
                      .filter((s) => s.document?.document_type !== 'contract')
                      .map((sig) => (
                        <div key={sig.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 size={14} className="text-green-600" />
                          <span className="text-[#5C4A42]">{sig.document?.name}</span>
                          <span className="text-[#8B7080] text-xs">
                            Signed {new Date(sig.signed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                <Button
                  onClick={handleApprove}
                  disabled={approvePacket1.isPending}
                  className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white"
                >
                  {approvePacket1.isPending ? 'Approving...' : 'Approve Packet 1'}
                </Button>
              </CardContent>
            </Card>
          )}

          {client.status === 'packet1_approved' && (
            <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                  <Send size={18} className="text-indigo-600" />
                  Select Service & Send Contract
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8B7080] mb-4">
                  Choose the service type and set the payment amount, then send the contract.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {(['birth_doula', 'postpartum_doula', 'death_doula'] as ServiceType[]).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedService(type)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          selectedService === type
                            ? 'border-[#B5648A] bg-[#B5648A]/5 shadow-md'
                            : 'border-[#E8D8E0] hover:border-[#D4A0BB] bg-white'
                        }`}
                      >
                        <div
                          className={`${selectedService === type ? 'text-[#B5648A]' : 'text-[#8B7080]'}`}
                        >
                          {SERVICE_ICONS[type]}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            selectedService === type ? 'text-[#6B3A5E]' : 'text-[#8B7080]'
                          }`}
                        >
                          {SERVICE_TYPE_LABELS[type]}
                        </span>
                      </button>
                    )
                  )}
                </div>
                <div className="space-y-1.5 mb-4">
                  <Label className="text-[#5C4A42] text-sm">Payment Amount ($)</Label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7080]" />
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-9 rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendContract}
                  disabled={sendContract.isPending || !selectedService || !paymentAmount}
                  className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-2"
                >
                  <Send size={16} />
                  {sendContract.isPending ? 'Sending...' : 'Send Contract'}
                </Button>
              </CardContent>
            </Card>
          )}

          {(client.status === 'contract_signed' || client.status === 'payment_pending') && (
            <Card className="rounded-2xl border-green-200 bg-green-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                  <CreditCard size={18} className="text-green-600" />
                  Confirm Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Square Payment Link */}
                <div>
                  <Label className="text-[#5C4A42] text-sm">Square Payment Link</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="url"
                      value={paymentLinkUrl}
                      onChange={(e) => setPaymentLinkUrl(e.target.value)}
                      placeholder="https://square.link/u/..."
                      className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!paymentLinkUrl.trim()) {
                          toast.error('Please enter a payment link URL');
                          return;
                        }
                        setPaymentLinkSaving(true);
                        try {
                          await savePaymentLink.mutateAsync({ clientId: client.id, paymentLinkUrl: paymentLinkUrl.trim() });
                          toast.success('Payment link saved');
                          // Send payment link email
                          try {
                            await fetch('/api/email/payment-link', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ client_id: client.id }),
                            });
                            toast.success('Payment link email sent to client');
                          } catch {
                            // Non-fatal
                          }
                        } catch {
                          toast.error('Failed to save payment link');
                        } finally {
                          setPaymentLinkSaving(false);
                        }
                      }}
                      disabled={paymentLinkSaving || !paymentLinkUrl.trim()}
                      className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white text-xs gap-1 h-9 px-4"
                    >
                      {paymentLinkSaving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      Save & Notify
                    </Button>
                  </div>
                  {client.payment_link_url && (
                    <a
                      href={client.payment_link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#B5648A] hover:underline mt-1 inline-block"
                    >
                      Current link: {client.payment_link_url}
                    </a>
                  )}
                </div>

                <hr className="border-[#E8D8E0]" />

                <div>
                  <p className="text-sm text-[#8B7080] mb-2">
                    {client.first_name} has signed their contract. Amount due:{' '}
                    <strong>
                      {client.payment_amount_cents
                        ? `$${(client.payment_amount_cents / 100).toFixed(2)}`
                        : 'the agreed amount'}
                    </strong>
                  </p>
                  <p className="text-xs text-[#8B7080] mb-4">
                    Payment will be auto-confirmed if the Square receipt email is detected. Use this
                    button as a manual fallback.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await confirmPayment.mutateAsync(client.id);
                        toast.success('Payment confirmed!', {
                          description: `${client.first_name} is now an active client`,
                        });
                      } catch {
                        toast.error('Failed to confirm payment');
                      }
                    }}
                    disabled={confirmPayment.isPending}
                    className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white gap-2"
                  >
                    <CheckCircle2 size={16} />
                    {confirmPayment.isPending ? 'Confirming...' : 'Confirm Payment Received'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 1. Messages (Conversation Thread) ── */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                <Send size={16} />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Conversation Thread */}
              {(() => {
                const messages = [...(activity?.filter((e) => e.action === 'message_sent') ?? [])].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                return messages.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {messages.map((msg) => {
                      const isFromClient = msg.actor === 'client';
                      return (
                        <div key={msg.id} className={`flex ${isFromClient ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] group relative`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isFromClient && (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center">
                                  <span className="text-white text-[8px] font-semibold">{client.first_name[0]}{client.last_name[0]}</span>
                                </div>
                              )}
                              <span className="text-[10px] text-[#8B7080]">
                                {isFromClient ? `${client.first_name}` : 'You'} &middot; {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              isFromClient
                                ? 'bg-white border border-[#E8D8E0]/50 text-[#5C4A42] rounded-bl-md'
                                : 'bg-gradient-to-r from-[#B5648A]/10 to-[#9B4D73]/10 text-[#5C4A42] rounded-br-md'
                            }`}>
                              <p className="whitespace-pre-wrap">{(msg.details as { message?: string })?.message ?? ''}</p>
                            </div>
                            {!isFromClient && (
                              <button
                                onClick={() => deleteMessage.mutateAsync({ messageId: msg.id, clientId }).then(() => toast.success('Deleted')).catch(() => toast.error('Failed'))}
                                className="absolute -right-6 top-4 p-1 rounded-lg text-[#C0A8B4] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}

              {/* Reply Input */}
              <div className="flex gap-2 items-end pt-1">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!messageText.trim() || addMessage.isPending) return;
                      addMessage.mutateAsync(messageText.trim()).then(() => {
                        toast.success('Message sent');
                        const preview = messageText.trim().slice(0, 100);
                        setMessageText('');
                        setNotifyDialog({ open: true, updateType: 'message', preview });
                      }).catch(() => toast.error('Failed'));
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 rounded-xl border border-[#E8D8E0] bg-[#FDF8F5] px-3 py-2 text-sm text-[#5C4A42] placeholder:text-[#C0A8B4] focus:outline-none focus:border-[#B5648A] resize-none"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!messageText.trim()) return;
                    try {
                      await addMessage.mutateAsync(messageText.trim());
                      toast.success('Message sent');
                      const preview = messageText.trim().slice(0, 100);
                      setMessageText('');
                      setNotifyDialog({ open: true, updateType: 'message', preview });
                    } catch { toast.error('Failed'); }
                  }}
                  disabled={!messageText.trim() || addMessage.isPending}
                  className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white h-9 px-3"
                >
                  <Send size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── 2. Notes ── */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                <StickyNote size={16} />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8B7080] bg-amber-50/50 border border-amber-100 rounded-xl">
                <StickyNote size={13} className="text-amber-500 flex-shrink-0" />
                Private notes — only visible to you
              </div>
              {!noteOpen ? (
                <button onClick={() => setNoteOpen(true)} className="flex items-center gap-2 text-sm text-[#8B7080] hover:text-[#6B3A5E] transition-colors">
                  <Plus size={16} className="text-[#B5648A]" />
                  Add a note
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note about this client..." rows={3} className="w-full rounded-xl border border-[#E8D8E0] bg-[#FDF8F5] px-3 py-2.5 text-sm text-[#5C4A42] placeholder:text-[#C0A8B4] focus:outline-none focus:border-[#B5648A] resize-none" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setNoteOpen(false); setNoteText(''); }} className="rounded-xl border-[#E8D8E0] text-[#8B7080] text-xs h-8">Cancel</Button>
                    <Button size="sm" onClick={async () => { if (!noteText.trim()) return; try { await addNote.mutateAsync(noteText.trim()); toast.success('Note added'); setNoteText(''); setNoteOpen(false); } catch { toast.error('Failed to add note'); } }} disabled={!noteText.trim() || addNote.isPending} className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white text-xs h-8">
                      {addNote.isPending ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                </div>
              )}
              {(() => {
                const notes = activity?.filter((e) => e.action === 'note_added') ?? [];
                return notes.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#5C4A42] leading-relaxed whitespace-pre-wrap">{(note.details as { note?: string })?.note ?? ''}</p>
                            <p className="text-xs text-[#8B7080] mt-1.5">{new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                          </div>
                          <button onClick={() => deleteNote.mutateAsync({ noteId: note.id, clientId }).then(() => toast.success('Note deleted')).catch(() => toast.error('Failed to delete'))} className="p-1 rounded-lg text-[#C0A8B4] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          {/* ── 3. Documents (Signed + Uploaded) ── */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                  <FileText size={16} />
                  Documents
                </CardTitle>
                {!pipelineStorageError && (
                  <Button variant="outline" size="sm" onClick={() => pipelineFileRef.current?.click()} disabled={pipelineUploading} className="rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] gap-1.5 text-xs h-8">
                    <Plus size={13} />
                    {pipelineUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                )}
                <input ref={pipelineFileRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePipelineUpload(file); e.target.value = ''; }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Signed Documents */}
              {signatures && signatures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#8B7080] uppercase tracking-wider mb-2">Signed</p>
                  <div className="space-y-2">
                    {signatures.map((sig) => (
                      <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={14} className="text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#5C4A42] truncate">{sig.document?.name}</p>
                            <p className="text-xs text-[#8B7080]">Signed by {sig.signer_name} &middot; {new Date(sig.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setViewerDoc({ open: true, documentId: sig.document_id, signerName: sig.signer_name, signedAt: sig.signed_at, ipAddress: sig.ip_address })}
                          className="p-2 rounded-lg text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors flex-shrink-0"
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Documents */}
              {pipelineStorageError ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{pipelineStorageError}</div>
              ) : uploadedDocs && uploadedDocs.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-[#8B7080] uppercase tracking-wider mb-2">Uploaded</p>
                  <div className="space-y-2">
                    {uploadedDocs.map((doc) => {
                      const supabase = createSupabaseClient();
                      const url = supabase.storage.from('client-documents').getPublicUrl(doc.storage_path).data.publicUrl;
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#F5EDF1] flex items-center justify-center flex-shrink-0"><FileText size={14} className="text-[#B5648A]" /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#5C4A42] truncate">{doc.file_name}</p>
                              <p className="text-xs text-[#8B7080]">{doc.uploaded_by === 'client' ? 'Uploaded by client' : 'Uploaded by you'} &middot; {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                            <button onClick={() => toggleVisibility.mutate({ docId: doc.id, visible: !doc.visible_to_client, clientId })} className={`p-2 rounded-lg transition-colors ${doc.visible_to_client ? 'text-[#B5648A] hover:bg-[#F5EDF1]' : 'text-[#C0A8B4] hover:bg-[#F5EDF1] hover:text-[#8B7080]'}`} title={doc.visible_to_client ? 'Visible to client — click to hide' : 'Hidden from client — click to share'}>
                              {doc.visible_to_client ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"><Download size={14} /></a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !signatures?.length ? (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[#E8D8E0] rounded-xl cursor-pointer hover:border-[#B5648A]/50 transition-colors" onClick={() => pipelineFileRef.current?.click()}>
                  <Upload size={20} className="text-[#8B7080] mb-2" />
                  <p className="text-sm text-[#8B7080]">Click to upload a document</p>
                  <p className="text-xs text-[#C0A8B4] mt-1">PDF, images, Word documents</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ── 4. Activity (Collapsible) ── */}
          {activity && activity.length > 0 && (
            <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
              <button
                onClick={() => setActivityOpen(!activityOpen)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <CardTitle className="text-[#6B3A5E] text-base">Activity</CardTitle>
                  <Badge className="bg-[#F5EDF1] text-[#6B3A5E] rounded-full text-xs px-2 py-0 border-0">{activity.length}</Badge>
                </div>
                <ChevronDown size={16} className={`text-[#8B7080] transition-transform duration-200 ${activityOpen ? 'rotate-180' : ''}`} />
              </button>
              {activityOpen && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {activity.map((entry, i) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#B5648A] mt-2" />
                          {i < activity.length - 1 && <div className="w-px flex-1 bg-[#E8D8E0] mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm text-[#5C4A42] font-medium">{entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                          <p className="text-xs text-[#8B7080] mt-0.5">{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} &middot; {entry.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <EditableClientInfo clientId={clientId} />

          {/* Portal Link */}
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#6B3A5E] text-base">Portal Link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#8B7080] mb-2">
                Share this link with the client to access their portal:
              </p>
              <div className="p-2 bg-[#FDF8F5] rounded-lg border border-[#E8D8E0] break-all">
                <p className="text-xs text-[#5C4A42] font-mono">{portalUrl}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl);
                  toast.success('Link copied!');
                }}
              >
                Copy Link
              </Button>

              {/* Send Reminder button */}
              <Button
                variant="outline"
                size="sm"
                disabled={reminderSending || reminderSent}
                onClick={handleSendReminder}
                className="mt-2 w-full rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] text-xs gap-1.5"
              >
                {reminderSending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Sending...
                  </>
                ) : reminderSent ? (
                  <>
                    <CheckCircle2 size={13} className="text-green-600" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Bell size={13} />
                    Send Reminder
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Portal Activity */}
          {(() => {
            const portalVisits = (activity ?? []).filter((e) => e.action === 'portal_visit');
            const lastVisit = portalVisits[0];
            const recentVisits = portalVisits.slice(0, 5);
            const totalSigs = signatures?.length ?? 0;

            const formatVisitDate = (iso: string) =>
              new Date(iso).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

            return (
              <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                    <Eye size={16} />
                    Portal Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/60 text-center">
                      <p className="text-lg font-semibold text-[#6B3A5E]">{portalVisits.length}</p>
                      <p className="text-xs text-[#8B7080]">visits</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/60 text-center">
                      <p className="text-xs font-medium text-[#6B3A5E] leading-tight">
                        {lastVisit
                          ? new Date(lastVisit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Never'}
                      </p>
                      <p className="text-xs text-[#8B7080]">last visit</p>
                    </div>
                  </div>

                  {/* Recent visits timeline */}
                  {recentVisits.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-[#8B7080] mb-2">Recent Visits</p>
                      <div className="space-y-1.5">
                        {recentVisits.map((visit) => (
                          <div
                            key={visit.id}
                            className="flex items-center gap-2 text-xs text-[#5C4A42]"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#B5648A] flex-shrink-0" />
                            <span>{formatVisitDate(visit.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8B7080] text-center py-2">No portal visits yet</p>
                  )}

                  {/* Documents signed */}
                  <div>
                    <p className="text-xs font-medium text-[#8B7080] mb-2">
                      Documents Signed ({totalSigs})
                    </p>
                    {totalSigs === 0 ? (
                      <p className="text-xs text-[#C0A8B4] italic">No documents signed yet</p>
                    ) : (
                      <div className="space-y-1.5">
                        {signatures!.map((sig) => (
                          <div key={sig.id} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[#5C4A42] truncate">{sig.document?.name}</p>
                              <p className="text-[#8B7080]">
                                {new Date(sig.signed_at).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      {/* Notify Client Dialog */}
      <NotifyClientDialog
        open={notifyDialog.open}
        onOpenChange={(open) => setNotifyDialog((d) => ({ ...d, open }))}
        clientId={clientId}
        clientName={`${client.first_name} ${client.last_name}`}
        updateType={notifyDialog.updateType}
        preview={notifyDialog.preview}
      />

      {/* Document Viewer */}
      <DocumentViewerDialog
        open={viewerDoc.open}
        onOpenChange={(open) => setViewerDoc((d) => ({ ...d, open }))}
        clientId={clientId}
        documentId={viewerDoc.documentId}
        signerName={viewerDoc.signerName}
        signedAt={viewerDoc.signedAt}
        ipAddress={viewerDoc.ipAddress}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: client, isLoading } = useClient(id);

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-[#8B7080]">Loading...</p>
      </div>
    );
  }

  const isActive = client.status === 'active';
  const backHref = isActive ? '/clients' : '/dashboard';
  const backLabel = isActive ? 'Back to Clients' : 'Back to Dashboard';

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Back */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-[#8B7080] hover:text-[#6B3A5E] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center shadow-lg shadow-[#B5648A]/20 flex-shrink-0">
            <span className="text-white text-lg font-semibold">
              {client.first_name[0]}{client.last_name[0]}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#6B3A5E]">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-sm text-[#8B7080]">{client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={`${STATUS_COLORS[client.status]} rounded-full px-3 py-1 text-sm font-medium border-0`}
          >
            {STATUS_LABELS[client.status]}
          </Badge>
          {client.service_type && (
            <Badge className="bg-[#F5EDF1] text-[#6B3A5E] rounded-full px-3 py-1 text-sm font-medium border-0">
              {SERVICE_TYPE_LABELS[client.service_type]}
            </Badge>
          )}
        </div>
      </div>

      {/* Content: active gets tabbed profile, others get pipeline */}
      {isActive ? (
        <ActiveClientProfile clientId={id} />
      ) : (
        <PipelineClientView client={client} clientId={id} />
      )}
    </div>
  );
}

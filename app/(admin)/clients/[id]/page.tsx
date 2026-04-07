'use client';

import { use, useState } from 'react';
import { useClient, useClientSignatures, useClientActivity, useApprovePacket1, useSendContract, useUpdateClient, useConfirmPayment } from '@/hooks/useClients';
import { PipelineStepper } from '@/components/admin/pipeline-stepper';
import { STATUS_LABELS, STATUS_COLORS, SERVICE_TYPE_LABELS, type ServiceType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Send, FileText, Clock, User, DollarSign, Heart, Baby, Flower2, CreditCard } from 'lucide-react';
import Link from 'next/link';

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  birth_doula: <Baby size={20} />,
  postpartum_doula: <Heart size={20} />,
  death_doula: <Flower2 size={20} />,
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: client, isLoading } = useClient(id);
  const { data: signatures } = useClientSignatures(id);
  const { data: activity } = useClientActivity(id);
  const approvePacket1 = useApprovePacket1();
  const sendContract = useSendContract();
  const confirmPayment = useConfirmPayment();
  const updateClient = useUpdateClient();

  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#8B7080]">Loading...</p>
      </div>
    );
  }

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
      toast.success('Contract sent!', { description: `${SERVICE_TYPE_LABELS[selectedService]} contract sent to ${client.email}` });
    } catch {
      toast.error('Failed to send contract');
    }
  };

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${client.access_token}`
    : '';

  return (
    <div className="p-8 max-w-5xl">
      {/* Back + Header */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#8B7080] hover:text-[#6B3A5E] mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center shadow-lg shadow-[#B5648A]/20">
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
        <Badge className={`${STATUS_COLORS[client.status]} rounded-full px-3 py-1 text-sm font-medium border-0`}>
          {STATUS_LABELS[client.status]}
        </Badge>
      </div>

      {/* Pipeline Stepper */}
      <Card className="mb-6 rounded-2xl border-[#E8D8E0]/50 shadow-sm">
        <CardContent className="pt-6 pb-4">
          <PipelineStepper currentStatus={client.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Action Card - contextual based on status */}
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
                    {signatures.filter(s => s.document?.document_type !== 'contract').map((sig) => (
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

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(['birth_doula', 'postpartum_doula', 'death_doula'] as ServiceType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedService(type)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        selectedService === type
                          ? 'border-[#B5648A] bg-[#B5648A]/5 shadow-md'
                          : 'border-[#E8D8E0] hover:border-[#D4A0BB] bg-white'
                      }`}
                    >
                      <div className={`${selectedService === type ? 'text-[#B5648A]' : 'text-[#8B7080]'}`}>
                        {SERVICE_ICONS[type]}
                      </div>
                      <span className={`text-xs font-medium ${selectedService === type ? 'text-[#6B3A5E]' : 'text-[#8B7080]'}`}>
                        {SERVICE_TYPE_LABELS[type]}
                      </span>
                    </button>
                  ))}
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
              <CardContent>
                <p className="text-sm text-[#8B7080] mb-2">
                  {client.first_name} has signed their contract.
                  Send them a Square invoice for <strong>${client.payment_amount_cents ? `$${(client.payment_amount_cents / 100).toFixed(2)}` : 'the agreed amount'}</strong>, then
                  confirm payment below once it&apos;s been received.
                </p>
                <p className="text-xs text-[#8B7080] mb-4">
                  Payment will be auto-confirmed if the Square receipt email is detected. Use this button as a manual fallback.
                </p>
                <Button
                  onClick={async () => {
                    try {
                      await confirmPayment.mutateAsync(client.id);
                      toast.success('Payment confirmed!', { description: `${client.first_name} is now an active client` });
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
              </CardContent>
            </Card>
          )}

          {/* Signed Documents */}
          {signatures && signatures.length > 0 && (
            <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#6B3A5E] text-base">Signed Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle2 size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#5C4A42]">{sig.document?.name}</p>
                          <p className="text-xs text-[#8B7080]">Signed by {sig.signer_name}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#8B7080]">
                        {new Date(sig.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          {activity && activity.length > 0 && (
            <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#6B3A5E] text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activity.map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[#B5648A] mt-2" />
                        {i < activity.length - 1 && <div className="w-px flex-1 bg-[#E8D8E0] mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm text-[#5C4A42] font-medium">
                          {entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                        <p className="text-xs text-[#8B7080] mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                          {' '}&middot;{' '}{entry.actor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
                <User size={16} />
                Client Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-[#8B7080]">Email</p>
                <p className="text-sm text-[#5C4A42]">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-xs text-[#8B7080]">Phone</p>
                  <p className="text-sm text-[#5C4A42]">{client.phone}</p>
                </div>
              )}
              {client.service_type && (
                <div>
                  <p className="text-xs text-[#8B7080]">Service Type</p>
                  <p className="text-sm text-[#5C4A42]">{SERVICE_TYPE_LABELS[client.service_type]}</p>
                </div>
              )}
              {client.payment_amount_cents && (
                <div>
                  <p className="text-xs text-[#8B7080]">Payment Amount</p>
                  <p className="text-sm text-[#5C4A42] font-medium">${(client.payment_amount_cents / 100).toFixed(2)}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-xs text-[#8B7080]">Notes</p>
                  <p className="text-sm text-[#5C4A42]">{client.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#8B7080]">Added</p>
                <p className="text-sm text-[#5C4A42]">
                  {new Date(client.created_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#6B3A5E] text-base">Portal Link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#8B7080] mb-2">Share this link with the client to access their portal:</p>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

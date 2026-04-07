'use client';

import { use, useState } from 'react';
import { usePortalClient } from '@/hooks/usePortal';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SERVICE_TYPE_LABELS } from '@/types';
import { toast } from 'sonner';
import { CreditCard, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: client } = usePortalClient(token);
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [processing, setProcessing] = useState(false);

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  const amount = client.payment_amount_cents
    ? (client.payment_amount_cents / 100).toFixed(2)
    : '0.00';

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // TODO: Integrate Square Web Payments SDK here
      // For now, simulate successful payment for testing
      await supabase.from('onboarding_payments').insert({
        client_id: client.id,
        amount_cents: client.payment_amount_cents || 0,
        status: 'completed',
      });

      await supabase
        .from('onboarding_clients')
        .update({
          status: 'active',
          payment_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      await supabase.from('onboarding_activity_log').insert({
        client_id: client.id,
        action: 'payment_completed',
        details: { amount_cents: client.payment_amount_cents },
        actor: 'client',
      });

      queryClient.invalidateQueries({ queryKey: ['portal', token] });
      toast.success('Payment successful!');
      router.push(`/portal/${token}/complete`);
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">Complete Your Payment</h1>
      <p className="text-sm text-[#8B7080] mb-6">
        You&apos;re almost there! Complete your payment to finalize your enrollment.
      </p>

      {/* Order Summary */}
      <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-[#6B3A5E] text-base">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8B7080]">Service</span>
              <span className="text-sm font-medium text-[#5C4A42]">
                {client.service_type ? SERVICE_TYPE_LABELS[client.service_type] : 'Doula Services'}
              </span>
            </div>
            <div className="border-t border-[#E8D8E0] pt-3 flex justify-between items-center">
              <span className="text-base font-semibold text-[#6B3A5E]">Total Due</span>
              <span className="text-2xl font-semibold text-[#6B3A5E]">${amount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form Placeholder */}
      <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="p-8 border-2 border-dashed border-[#E8D8E0] rounded-xl text-center mb-4">
            <CreditCard size={32} className="text-[#B5648A] mx-auto mb-3" />
            <p className="text-sm text-[#8B7080]">
              Square payment form will be integrated here.
            </p>
            <p className="text-xs text-[#8B7080] mt-1">
              For testing, click the button below to simulate a payment.
            </p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white py-5 text-base shadow-lg shadow-[#B5648A]/20 gap-2"
          >
            <CreditCard size={18} />
            {processing ? 'Processing...' : `Pay $${amount}`}
          </Button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-[#8B7080]">
            <Shield size={14} />
            <span>Secure payment powered by Square</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

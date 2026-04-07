'use client';

import { use } from 'react';
import { usePortalClient } from '@/hooks/usePortal';
import { SERVICE_TYPE_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Shield, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: client } = usePortalClient(token);

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

  // If payment is already completed, show success and link to complete page
  if (client.status === 'active' || client.payment_completed_at) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col items-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">Payment Received!</h1>
          <p className="text-sm text-[#8B7080] mb-6">
            Your payment has been confirmed. You&apos;re all set!
          </p>
          <Link
            href={`/portal/${token}/complete`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white font-medium shadow-lg shadow-[#B5648A]/20"
          >
            Continue
          </Link>
        </div>
      </motion.div>
    );
  }

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

      {/* Payment Instructions */}
      {client.payment_link_url ? (
        <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-[#F5EDF1] flex items-center justify-center mb-4">
                <CreditCard size={24} className="text-[#B5648A]" />
              </div>
              <h2 className="text-base font-semibold text-[#6B3A5E] mb-2">
                Ready to Pay
              </h2>
              <p className="text-sm text-[#8B7080] leading-relaxed mb-6">
                Your payment link is ready. Click the button below to complete your payment securely via Square.
              </p>

              <a
                href={client.payment_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white font-semibold text-base shadow-lg shadow-[#B5648A]/20 hover:from-[#9B4D73] hover:to-[#6B3A5E] transition-all"
              >
                <CreditCard size={20} />
                Pay Now
              </a>

              <div className="flex items-center justify-center gap-2 mt-6 text-xs text-[#8B7080]">
                <Shield size={14} />
                <span>Secure payment powered by Square</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-[#F5EDF1] flex items-center justify-center mb-4">
                <CreditCard size={24} className="text-[#B5648A]" />
              </div>
              <h2 className="text-base font-semibold text-[#6B3A5E] mb-2">
                Payment via Square
              </h2>

              <div className="w-full bg-[#FDF8F5] rounded-xl border border-[#E8D8E0]/50 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#5C4A42]">Payment Link Being Prepared</p>
                    <p className="text-xs text-[#8B7080]">
                      Your payment link is being set up. You&apos;ll receive an email when it&apos;s ready.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#8B7080]">
                Questions? Contact us at{' '}
                <a href="mailto:meikasmealprepserv@gmail.com" className="text-[#B5648A] hover:underline">
                  meikasmealprepserv@gmail.com
                </a>
              </p>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-[#8B7080]">
                <Shield size={14} />
                <span>Secure payment powered by Square</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

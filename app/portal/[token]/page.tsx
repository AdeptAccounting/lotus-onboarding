'use client';

import { use } from 'react';
import { usePortalClient } from '@/hooks/usePortal';
import { PIPELINE_STEPS, STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Check, FileText, PenTool, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const PORTAL_STEPS = [
  { status: 'packet1_sent', label: 'Review & Sign Documents', icon: FileText, href: '/documents' },
  { status: 'packet1_submitted', label: 'Awaiting Review', icon: Sparkles, href: null },
  { status: 'packet1_approved', label: 'Awaiting Contract', icon: Sparkles, href: null },
  { status: 'contract_sent', label: 'Sign Contract', icon: PenTool, href: '/contract' },
  { status: 'contract_signed', label: 'Make Payment', icon: CreditCard, href: '/payment' },
  { status: 'payment_pending', label: 'Make Payment', icon: CreditCard, href: '/payment' },
  { status: 'active', label: 'All Complete!', icon: Check, href: '/complete' },
];

export default function PortalWelcomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: client, isLoading, error } = usePortalClient(token);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
          <p className="text-sm text-[#8B7080]">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[#6B3A5E] font-medium">Portal not found</p>
        <p className="text-sm text-[#8B7080] mt-1">This link may be invalid or expired.</p>
      </div>
    );
  }

  const currentStep = PORTAL_STEPS.find((s) => s.status === client.status);
  const stepIndex = PORTAL_STEPS.findIndex((s) => s.status === client.status);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Welcome Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-[#6B3A5E]">
            Welcome, {client.first_name}!
          </h1>
          <p className="text-[#8B7080] mt-2">
            We&apos;re so glad you&apos;re here. Let&apos;s get you started on your journey with us.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-semibold text-[#6B3A5E] mb-4">Your Onboarding Progress</h2>
          <div className="space-y-3">
            {[
              { label: 'Review & Sign Intake Documents', statuses: ['packet1_sent'] },
              { label: 'Documents Under Review', statuses: ['packet1_submitted', 'packet1_approved'] },
              { label: 'Sign Your Service Contract', statuses: ['contract_sent'] },
              { label: 'Complete Payment', statuses: ['contract_signed', 'payment_pending'] },
              { label: 'Welcome! You\'re All Set', statuses: ['active'] },
            ].map((step, i) => {
              const isComplete = stepIndex > PORTAL_STEPS.findIndex((s) => step.statuses.includes(s.status));
              const isCurrent = step.statuses.includes(client.status);

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isComplete
                      ? 'bg-gradient-to-br from-[#B5648A] to-[#9B4D73] text-white'
                      : isCurrent
                      ? 'bg-[#B5648A] text-white ring-4 ring-[#B5648A]/15'
                      : 'bg-[#F5EDF1] text-[#8B7080]'
                  }`}>
                    {isComplete ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-sm ${
                    isCurrent ? 'text-[#6B3A5E] font-medium' : isComplete ? 'text-[#B5648A]' : 'text-[#8B7080]'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Action */}
        {currentStep && currentStep.href && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center"
          >
            <Link href={`/portal/${token}${currentStep.href}`}>
              <Button className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white px-8 py-6 text-base shadow-lg shadow-[#B5648A]/20 gap-2">
                {currentStep.icon && <currentStep.icon size={20} />}
                {currentStep.label}
              </Button>
            </Link>
          </motion.div>
        )}

        {client.status === 'packet1_submitted' && (
          <div className="text-center bg-purple-50/50 rounded-2xl p-6 border border-purple-100">
            <Sparkles size={24} className="text-purple-500 mx-auto mb-3" />
            <p className="text-[#6B3A5E] font-medium">Your documents are being reviewed</p>
            <p className="text-sm text-[#8B7080] mt-1">We&apos;ll notify you once they&apos;re approved. Hang tight!</p>
          </div>
        )}

        {client.status === 'packet1_approved' && (
          <div className="text-center bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
            <Check size={24} className="text-indigo-500 mx-auto mb-3" />
            <p className="text-[#6B3A5E] font-medium">Your documents have been approved!</p>
            <p className="text-sm text-[#8B7080] mt-1">Your contract is being prepared. You&apos;ll receive a notification soon.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

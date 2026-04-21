'use client';

import { use } from 'react';
import { usePortalClient } from '@/hooks/usePortal';
import { PIPELINE_STEPS, STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Check, FileText, PenTool, CreditCard, Sparkles, MessageSquare, Heart, ClipboardList, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

function buildSurveyUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_SURVEY_PREFILL_URL
    || 'https://docs.google.com/forms/d/e/1FAIpQLSfdGDDjzMBHA9KqN7ZTuZffQ-Qxz_dwDWWMd8z6oi98saafvg/viewform';
  if (base.includes('{{email}}')) return base.replace('{{email}}', encodeURIComponent(email));
  return base;
}

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
  // Poll every 15s so the survey gate auto-unlocks once Apps Script fires the
  // webhook without the client needing to refresh.
  const { data: client, isLoading, error } = usePortalClient(token, { refetchInterval: 15000 });

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

  // Pre-Service Survey gate — every new client must submit the survey before
  // Packet 1 and the rest of the portal unlocks. Determined by the presence of
  // a survey_completed_at timestamp on the client row, populated by the
  // /api/webhooks/survey-complete endpoint (fired by Google Apps Script on
  // form submit).
  if (!client.survey_completed_at) {
    const surveyUrl = buildSurveyUrl(client.email);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#6B3A5E]">
            Welcome, {client.first_name}!
          </h1>
          <p className="text-[#8B7080] mt-2">
            Before we begin your onboarding, we&apos;d love to learn a little about you.
          </p>
        </div>

        <Card className="rounded-2xl border-[#E8D8E0]/60 shadow-sm bg-gradient-to-br from-white to-[#FDF8F5]">
          <CardContent className="p-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B5648A]/15 to-[#B5648A]/5 flex items-center justify-center">
              <ClipboardList size={30} className="text-[#B5648A]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#6B3A5E]">
                Complete your Pre-Service Survey
              </h2>
              <p className="text-sm text-[#8B7080] mt-2 max-w-sm mx-auto">
                This takes about 2 minutes. Your Packet 1 documents will unlock
                as soon as you submit it.
              </p>
            </div>
            <a href={surveyUrl} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white px-8 py-6 text-base shadow-lg shadow-[#B5648A]/20 gap-2">
                <ExternalLink size={18} />
                Open Pre-Service Survey
              </Button>
            </a>
            <p className="text-xs text-[#C0A8B4]">
              Opens in a new tab. Your portal will unlock automatically once we receive your submission.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 mt-6 p-4 rounded-xl bg-[#F5EDF1]/60 border border-[#E8D8E0]/40">
          <Sparkles size={16} className="text-[#B5648A] flex-shrink-0" />
          <p className="text-xs text-[#8B7080]">
            Already submitted the survey? It can take up to 15 seconds for your portal to update.
          </p>
        </div>

        <p className="text-center text-[10px] text-[#C0A8B4] mt-10 tracking-wide">Powered by Adept Data Automation</p>
      </motion.div>
    );
  }

  const isActive = client.status === 'active';
  const currentStep = PORTAL_STEPS.find((s) => s.status === client.status);
  const stepIndex = PORTAL_STEPS.findIndex((s) => s.status === client.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-[#6B3A5E]">
          Welcome{isActive ? ' back' : ''}, {client.first_name}!
        </h1>
        <p className="text-[#8B7080] mt-2">
          {isActive
            ? 'Your client portal — everything in one place.'
            : "We're so glad you're here. Let's get you started on your journey with us."}
        </p>
      </div>

      {/* Onboarding Progress (non-active only) */}
      {!isActive && (
        <>
          <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 p-6 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#6B3A5E] mb-4">Your Onboarding Progress</h2>
            <div className="space-y-3">
              {[
                { label: 'Review & Sign Intake Documents', statuses: ['packet1_sent'] },
                { label: 'Documents Under Review', statuses: ['packet1_submitted', 'packet1_approved'] },
                { label: 'Sign Your Service Contract', statuses: ['contract_sent'] },
                { label: 'Complete Payment', statuses: ['contract_signed', 'payment_pending'] },
                { label: "Welcome! You're All Set", statuses: ['active'] },
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

          {/* Current Action Button */}
          {currentStep && currentStep.href && (
            <div className="text-center mb-8">
              <Link href={`/portal/${token}${currentStep.href}`}>
                <Button className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white px-8 py-6 text-base shadow-lg shadow-[#B5648A]/20 gap-2">
                  {currentStep.icon && <currentStep.icon size={20} />}
                  {currentStep.label}
                </Button>
              </Link>
            </div>
          )}

          {client.status === 'packet1_submitted' && (
            <div className="text-center bg-purple-50/50 rounded-2xl p-6 border border-purple-100 mb-8">
              <Sparkles size={24} className="text-purple-500 mx-auto mb-3" />
              <p className="text-[#6B3A5E] font-medium">Your documents are being reviewed</p>
              <p className="text-sm text-[#8B7080] mt-1">We&apos;ll notify you once they&apos;re approved. Hang tight!</p>
            </div>
          )}

          {client.status === 'packet1_approved' && (
            <div className="text-center bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 mb-8">
              <Check size={24} className="text-indigo-500 mx-auto mb-3" />
              <p className="text-[#6B3A5E] font-medium">Your documents have been approved!</p>
              <p className="text-sm text-[#8B7080] mt-1">Your contract is being prepared. You&apos;ll receive a notification soon.</p>
            </div>
          )}
        </>
      )}

      {/* Hub Cards — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href={`/portal/${token}/my-documents`}>
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EDF1] flex items-center justify-center mb-3">
                <FileText size={22} className="text-[#B5648A]" />
              </div>
              <h3 className="text-sm font-semibold text-[#6B3A5E] mb-1">Documents</h3>
              <p className="text-xs text-[#8B7080]">View your signed documents and shared files</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/portal/${token}/messages`}>
          <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EDF1] flex items-center justify-center mb-3">
                <MessageSquare size={22} className="text-[#B5648A]" />
              </div>
              <h3 className="text-sm font-semibold text-[#6B3A5E] mb-1">Messages</h3>
              <p className="text-xs text-[#8B7080]">Read messages from your care team</p>
            </CardContent>
          </Card>
        </Link>

        {client.payment_link_url && (
          <Link href={`/portal/${token}/payment`}>
            <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-[#F5EDF1] flex items-center justify-center mb-3">
                  <CreditCard size={22} className="text-[#B5648A]" />
                </div>
                <h3 className="text-sm font-semibold text-[#6B3A5E] mb-1">Payment</h3>
                <p className="text-xs text-[#8B7080]">View and complete your payment</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {isActive && (
        <div className="flex items-center justify-center gap-1 text-[#B5648A] mt-10">
          <Heart size={14} fill="#B5648A" />
          <span className="text-sm font-medium">Thank you for being part of the Lotus family</span>
          <Heart size={14} fill="#B5648A" />
        </div>
      )}
      <p className="text-center text-[10px] text-[#C0A8B4] mt-10 tracking-wide">Powered by Adept Data Automation</p>
    </motion.div>
  );
}

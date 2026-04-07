'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalClient } from '@/hooks/usePortal';
import { motion } from 'framer-motion';
import { CheckCircle2, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function CompletePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: client } = usePortalClient(token);

  // Redirect active clients who navigate here directly to the hub
  useEffect(() => {
    if (client?.status === 'active' && !sessionStorage.getItem(`portal_just_completed_${token}`)) {
      router.replace(`/portal/${token}`);
    }
  }, [client, token, router]);

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="text-center py-10"
    >
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100"
      >
        <CheckCircle2 size={48} className="text-green-600" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-semibold text-[#6B3A5E] mb-3"
      >
        Welcome to the Lotus Family!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-[#8B7080] max-w-md mx-auto mb-8"
      >
        {client.first_name}, your onboarding is complete. All of your documents have been signed and your
        payment has been processed. We are so excited to begin this journey with you.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border border-[#E8D8E0]/50 p-8 max-w-md mx-auto shadow-sm"
      >
        <Image
          src="/logo.png"
          alt="The Lotus Program Experience"
          width={64}
          height={64}
          className="mx-auto mb-4"
        />
        <h2 className="text-base font-semibold text-[#6B3A5E] mb-2">What&apos;s Next?</h2>
        <p className="text-sm text-[#8B7080] mb-4">
          Your doula will be in touch shortly to schedule your first session and begin creating your
          personalized care plan. In the meantime, feel free to reach out with any questions.
        </p>
        <div className="flex items-center justify-center gap-1 text-[#B5648A]">
          <Heart size={14} fill="#B5648A" />
          <span className="text-sm font-medium">Thank you for trusting us with your care</span>
          <Heart size={14} fill="#B5648A" />
        </div>
      </motion.div>
    </motion.div>
  );
}

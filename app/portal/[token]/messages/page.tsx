'use client';

import { use } from 'react';
import { usePortalMessages } from '@/hooks/usePortal';
import { Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PortalMessagesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: messages, isLoading } = usePortalMessages(token);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">Messages</h1>
      <p className="text-sm text-[#8B7080] mb-6">Messages from your care team.</p>

      {!messages || messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E8D8E0]/50">
          <div className="w-14 h-14 rounded-full bg-[#F5EDF1] flex items-center justify-center mb-3">
            <MessageSquare size={22} className="text-[#B5648A]" />
          </div>
          <p className="text-[#6B3A5E] font-medium">No messages yet</p>
          <p className="text-sm text-[#8B7080] mt-1">You&apos;ll see messages from Femeika here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white rounded-2xl border border-[#E8D8E0]/50 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">F</span>
                </div>
                <span className="text-xs font-medium text-[#6B3A5E]">Femeika</span>
                <span className="text-xs text-[#8B7080]">
                  {new Date(msg.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-[#5C4A42] leading-relaxed whitespace-pre-wrap">
                {(msg.details as { message?: string })?.message ?? ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

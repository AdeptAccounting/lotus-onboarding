'use client';

import { use, useState, useRef, useEffect } from 'react';
import { usePortalClient, usePortalMessages, usePortalSendMessage } from '@/hooks/usePortal';
import { Sparkles, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PortalMessagesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: client } = usePortalClient(token);
  const { data: messages, isLoading } = usePortalMessages(token);
  const sendMessage = usePortalSendMessage(token);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
      </div>
    );
  }

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await sendMessage.mutateAsync(text.trim());
      setText('');
    } catch {
      toast.error('Failed to send message');
    }
  };

  // Sort messages oldest first for conversation view
  const sorted = [...(messages ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full">
      <h1 className="text-xl font-semibold text-[#6B3A5E] mb-2">Messages</h1>
      <p className="text-sm text-[#8B7080] mb-6">Chat with your care team.</p>

      {/* Message Thread */}
      <div className="flex-1 space-y-3 mb-4 min-h-[200px]">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#E8D8E0]/50">
            <div className="w-14 h-14 rounded-full bg-[#F5EDF1] flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-[#B5648A]" />
            </div>
            <p className="text-[#6B3A5E] font-medium">No messages yet</p>
            <p className="text-sm text-[#8B7080] mt-1">Send a message to get started.</p>
          </div>
        ) : (
          sorted.map((msg) => {
            const isClient = msg.actor === 'client';
            return (
              <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] sm:max-w-[75%] ${isClient ? 'order-2' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!isClient && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center">
                        <span className="text-white text-[10px] font-semibold">F</span>
                      </div>
                    )}
                    <span className="text-xs text-[#8B7080]">
                      {isClient ? 'You' : 'Femeika'} &middot; {new Date(msg.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isClient
                      ? 'bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white rounded-br-md'
                      : 'bg-white border border-[#E8D8E0]/50 text-[#5C4A42] rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">
                      {(msg.details as { message?: string })?.message ?? ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#FDF8F5] via-[#FDF8F5] pt-2">
        <div className="flex gap-2 items-end bg-white rounded-2xl border border-[#E8D8E0]/50 p-3 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 text-sm text-[#5C4A42] placeholder:text-[#C0A8B4] bg-transparent focus:outline-none resize-none"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white h-9 px-4 gap-1"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

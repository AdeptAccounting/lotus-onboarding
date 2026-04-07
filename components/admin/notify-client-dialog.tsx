'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotifyClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  updateType: 'message' | 'document' | 'payment_link';
  preview?: string;
}

export function NotifyClientDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  updateType,
  preview,
}: NotifyClientDialogProps) {
  const [sending, setSending] = useState(false);

  const handleNotify = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/email/portal-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, update_type: updateType, preview }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Notification sent to ${clientName}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const firstName = clientName.split(' ')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#6B3A5E]">
            <Bell size={16} className="text-[#B5648A]" />
            Notify Client?
          </DialogTitle>
          <DialogDescription>
            Send an email notification to <strong>{firstName}</strong> about this update?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="rounded-xl border-[#E8D8E0] text-[#8B7080]"
          >
            No, Skip
          </Button>
          <Button
            onClick={handleNotify}
            disabled={sending}
            className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sending...
              </>
            ) : (
              'Yes, Notify'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

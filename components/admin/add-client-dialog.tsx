'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateClient } from '@/hooks/useClients';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const createClient = useCreateClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      toast.success('Client added!', { description: `Welcome email sent to ${email}` });
      setOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Failed to add client', { description: message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white shadow-lg shadow-[#B5648A]/20 px-4 py-2 text-sm font-medium cursor-pointer"
      >
        <UserPlus size={18} />
        Add New Client
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl border-[#E8D8E0]">
        <DialogHeader>
          <DialogTitle className="text-[#6B3A5E] text-lg">Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[#5C4A42] text-sm">First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#5C4A42] text-sm">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#5C4A42] text-sm">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
              required
              className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#5C4A42] text-sm">Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#5C4A42] text-sm">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this client..."
              rows={3}
              className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border-[#E8D8E0] text-[#8B7080] hover:bg-[#F5EDF1]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createClient.isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white"
            >
              {createClient.isPending ? 'Adding...' : 'Add & Send Packet 1'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

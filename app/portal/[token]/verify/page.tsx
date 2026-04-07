'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: client, error: dbError } = await supabase
        .from('onboarding_clients')
        .select('id, email')
        .eq('access_token', token)
        .single();

      if (dbError || !client) {
        setError('This portal link is invalid or has expired.');
        return;
      }

      if (client.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        setError('That email does not match our records. Please check and try again.');
        return;
      }

      // Store verification flag in sessionStorage
      sessionStorage.setItem(`portal_verified_${token}`, '1');

      // Log the portal visit
      await supabase.from('onboarding_activity_log').insert({
        client_id: client.id,
        action: 'portal_visit',
        details: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        },
        actor: 'client',
      });

      router.replace(`/portal/${token}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F5] via-white to-[#F5EDF1] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-[#B5648A]/10 border border-[#E8D8E0] flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="The Lotus Program Experience" width={48} height={48} />
          </div>
          <h1 className="text-xl font-semibold text-[#6B3A5E] text-center">
            Welcome to Your Portal
          </h1>
          <p className="text-sm text-[#8B7080] mt-2 text-center leading-relaxed">
            Please enter your email address to access your onboarding documents.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E8D8E0] shadow-sm p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[#5C4A42] text-sm font-medium">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A] h-10"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700"
              >
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] hover:from-[#9B4D73] hover:to-[#6B3A5E] text-white py-5 text-sm font-medium shadow-lg shadow-[#B5648A]/20 gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8B7080] mt-6">
          The Lotus Program Experience &mdash; Secure Client Portal
        </p>
      </motion.div>
    </div>
  );
}

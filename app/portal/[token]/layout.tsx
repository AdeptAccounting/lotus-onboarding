'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Home, FileText, MessageSquare, CreditCard } from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export default function PortalLayout({ children, params }: PortalLayoutProps) {
  const { token } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [clientStatus, setClientStatus] = useState<string | null>(null);
  const [hasPaymentLink, setHasPaymentLink] = useState(false);

  const isVerifyPage = pathname === `/portal/${token}/verify`;
  const isMessagesPage = pathname === `/portal/${token}/messages`;
  const containerMaxWidth = isMessagesPage ? 'max-w-5xl' : 'max-w-3xl';

  useEffect(() => {
    if (isVerifyPage) {
      // Don't redirect on the verify page itself
      setVerified(true);
      return;
    }

    const flag = sessionStorage.getItem(`portal_verified_${token}`);
    if (!flag) {
      router.replace(`/portal/${token}/verify`);
    } else {
      setVerified(true);

      // Fetch client status for nav
      const supabaseForStatus = createClient();
      supabaseForStatus
        .from('onboarding_clients')
        .select('status, payment_link_url')
        .eq('access_token', token)
        .single()
        .then(({ data }) => {
          if (data) {
            setClientStatus(data.status);
            setHasPaymentLink(!!data.payment_link_url);
          }
        });

      // Log a portal_visit if we haven't logged one in the last 30 minutes
      const lastVisitKey = `portal_last_visit_${token}`;
      const lastVisit = sessionStorage.getItem(lastVisitKey);
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;

      if (!lastVisit || now - parseInt(lastVisit, 10) > thirtyMinutes) {
        sessionStorage.setItem(lastVisitKey, String(now));

        // Fire-and-forget: fetch client by token, then log the visit
        const supabase = createClient();
        supabase
          .from('onboarding_clients')
          .select('id')
          .eq('access_token', token)
          .single()
          .then(({ data: client }) => {
            if (client) {
              supabase.from('onboarding_activity_log').insert({
                client_id: client.id,
                action: 'portal_visit',
                details: {
                  timestamp: new Date().toISOString(),
                  user_agent: navigator.userAgent,
                },
                actor: 'client',
              });
            }
          });
      }
    }
  }, [token, isVerifyPage, router]);

  const handleSignOut = () => {
    sessionStorage.removeItem(`portal_verified_${token}`);
    router.push(`/portal/${token}/verify`);
  };

  // While checking verification, show nothing to avoid flash
  if (verified === null) {
    return null;
  }

  // The verify page renders its own full-screen layout
  if (isVerifyPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FDF8F5] via-white to-[#F5EDF1]">
      {/* Header */}
      <header className="border-b border-[#E8D8E0]/50 bg-white/80 backdrop-blur-sm">
        <div className={`${containerMaxWidth} mx-auto px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="The Lotus Program Experience" width={48} height={48} />
            <div>
              <h1 className="text-base font-semibold text-[#6B3A5E]">The Lotus Program Experience</h1>
              <p className="text-xs text-[#B5648A]">Client Portal</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-[#8B7080] hover:text-[#6B3A5E] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F5EDF1]"
            title="Sign out of portal"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* Nav tabs — visible for all clients */}
        {clientStatus && (
          <div className={`${containerMaxWidth} mx-auto px-6`}>
            <nav className="flex gap-1 -mb-px">
              {[
                { href: `/portal/${token}`, label: 'Home', icon: Home },
                { href: `/portal/${token}/my-documents`, label: 'Documents', icon: FileText },
                { href: `/portal/${token}/messages`, label: 'Messages', icon: MessageSquare },
                ...(hasPaymentLink ? [{ href: `/portal/${token}/payment`, label: 'Payment', icon: CreditCard }] : []),
              ].map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'border-[#B5648A] text-[#6B3A5E]'
                        : 'border-transparent text-[#8B7080] hover:text-[#6B3A5E] hover:border-[#E8D8E0]'
                    }`}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className={`${containerMaxWidth} mx-auto px-6 py-8 flex-1`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8D8E0]/50 bg-white/50 mt-auto">
        <div className={`${containerMaxWidth} mx-auto px-6 py-4 text-center`}>
          <p className="text-xs text-[#8B7080]">
            &copy; {new Date().getFullYear()} The Lotus Program Experience. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

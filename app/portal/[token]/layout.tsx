'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export default function PortalLayout({ children, params }: PortalLayoutProps) {
  const { token } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState<boolean | null>(null);

  const isVerifyPage = pathname === `/portal/${token}/verify`;

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
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F5] via-white to-[#F5EDF1]">
      {/* Header */}
      <header className="border-b border-[#E8D8E0]/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="The Lotus Program Experience" width={48} height={48} />
            <div>
              <h1 className="text-base font-semibold text-[#6B3A5E]">The Lotus Program Experience</h1>
              <p className="text-xs text-[#B5648A]">Client Onboarding Portal</p>
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
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8D8E0]/50 bg-white/50 mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-[#8B7080]">
            &copy; {new Date().getFullYear()} The Lotus Program Experience. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

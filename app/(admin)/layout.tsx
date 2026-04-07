'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Users, Settings, LayoutDashboard, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDF8F5]">
        <div className="flex flex-col items-center gap-4">
          <Image src="/logo.png" alt="Lotus Program" width={80} height={80} className="animate-pulse" />
          <p className="text-[#8B7080] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FDF8F5]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E8D8E0] bg-white flex flex-col">
        <div className="p-6 border-b border-[#E8D8E0]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Lotus Program" width={44} height={44} />
            <div>
              <h1 className="text-sm font-semibold text-[#6B3A5E] leading-tight">The Lotus Program</h1>
              <p className="text-xs text-[#B5648A]">Client Onboarding</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#B5648A]/10 to-[#9B4D73]/10 text-[#6B3A5E] shadow-sm'
                    : 'text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8D8E0]">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B5648A] to-[#9B4D73] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {user?.email?.[0]?.toUpperCase() || 'M'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#5C4A42] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] w-full transition-all duration-200"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

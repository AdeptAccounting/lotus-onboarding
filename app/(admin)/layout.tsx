'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Users, Settings, LayoutDashboard, LogOut, Menu, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/guide', label: 'How It Works', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      <div className="p-6 border-b border-[#E8D8E0]">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavClick}>
          <Image src="/logo.png" alt="Lotus Program" width={44} height={44} />
          <div>
            <h1 className="text-sm font-semibold text-[#6B3A5E] leading-tight">The Lotus Program</h1>
            <p className="text-xs text-[#B5648A]">Client Onboarding</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isClientDetailPage = /^\/clients\/[^/]+/.test(pathname);
          const fromParam = isClientDetailPage && typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('from')
            : null;
          let isActive: boolean;
          if (isClientDetailPage) {
            if (item.href === '/dashboard') {
              isActive = fromParam === 'dashboard' || !fromParam;
            } else if (item.href === '/clients') {
              isActive = fromParam === 'clients';
            } else {
              isActive = false;
            }
          } else {
            isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          }
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
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
    </>
  );

  return (
    <div className="flex h-screen bg-[#FDF8F5]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[#E8D8E0] bg-white flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E8D8E0] flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile Top Bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E8D8E0] md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Lotus Program" width={28} height={28} />
            <span className="text-sm font-semibold text-[#6B3A5E]">The Lotus Program</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

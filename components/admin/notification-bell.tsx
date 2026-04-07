'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';
import { Bell, MessageSquare, FileText } from 'lucide-react';
import Link from 'next/link';

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const count = unreadCount ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-[#8B7080] hover:bg-[#F5EDF1] hover:text-[#6B3A5E] transition-colors"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-[#B5648A] text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#E8D8E0] shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8D8E0]/50">
            <p className="text-sm font-semibold text-[#6B3A5E]">Notifications</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={20} className="text-[#C0A8B4] mx-auto mb-2" />
                <p className="text-xs text-[#8B7080]">No new notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((item) => (
                <Link
                  key={item.id}
                  href={`/clients/${item.clientId}?from=dashboard`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#FDF8F5] transition-colors border-b border-[#E8D8E0]/30 last:border-0"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === 'message' ? 'bg-blue-50' : 'bg-green-50'
                  }`}>
                    {item.type === 'message' ? (
                      <MessageSquare size={14} className="text-blue-500" />
                    ) : (
                      <FileText size={14} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#5C4A42]">
                      <span className="font-medium">{item.clientName}</span>
                      {item.type === 'message' ? ' sent a message' : ''}
                    </p>
                    {item.preview && (
                      <p className="text-xs text-[#8B7080] truncate mt-0.5">{item.preview}</p>
                    )}
                    <p className="text-xs text-[#C0A8B4] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {item.type === 'message' && (
                    <div className="w-2 h-2 rounded-full bg-[#B5648A] flex-shrink-0 mt-2" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

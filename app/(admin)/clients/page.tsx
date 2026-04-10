'use client';

import { Suspense, useState, useMemo } from 'react';
import { useActiveClients, useArchivedClients } from '@/hooks/useClients';
import { AddActiveClientDialog } from '@/components/admin/add-active-client-dialog';
import { SERVICE_TYPE_LABELS } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Sparkles, Archive } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function ClientsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') === 'archived' ? 'archived' : 'active';

  const { data: activeClients, isLoading: activeLoading } = useActiveClients();
  const { data: archivedClients, isLoading: archivedLoading } = useArchivedClients();

  const clients = view === 'archived' ? archivedClients : activeClients;
  const isLoading = view === 'archived' ? archivedLoading : activeLoading;

  const [search, setSearch] = useState('');

  const setView = (next: 'active' | 'archived') => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'archived') params.set('view', 'archived');
    else params.delete('view');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const filtered = useMemo(() => {
    if (!clients) return [];
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const isArchivedView = view === 'archived';

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#6B3A5E]">
            {isArchivedView ? 'Archived Clients' : 'Active Clients'}
          </h1>
          <p className="text-sm text-[#8B7080] mt-1">
            {isArchivedView
              ? 'Clients you\u2019ve archived. Open one to restore it.'
              : 'Full profiles for all active clients'}
          </p>
        </div>
        {!isArchivedView && <AddActiveClientDialog />}
      </div>

      {/* View toggle */}
      <div className="inline-flex gap-1 p-1 bg-white border border-[#E8D8E0] rounded-xl mb-6">
        <button
          onClick={() => setView('active')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !isArchivedView
              ? 'bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white shadow-sm'
              : 'text-[#8B7080] hover:text-[#6B3A5E]'
          }`}
        >
          Active
          {activeClients && (
            <span className={`ml-2 ${!isArchivedView ? 'text-white/80' : 'text-[#C0A8B4]'}`}>
              {activeClients.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setView('archived')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            isArchivedView
              ? 'bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white shadow-sm'
              : 'text-[#8B7080] hover:text-[#6B3A5E]'
          }`}
        >
          <Archive size={12} />
          Archived
          {archivedClients && (
            <span className={`ml-1 ${isArchivedView ? 'text-white/80' : 'text-[#C0A8B4]'}`}>
              {archivedClients.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7080]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isArchivedView ? 'Search archived clients...' : 'Search clients...'}
          className="pl-9 rounded-xl border-[#E8D8E0] bg-white focus:border-[#B5648A]"
        />
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
            <p className="text-sm text-[#8B7080]">Loading clients...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E8D8E0]/50">
          <div className="w-16 h-16 rounded-full bg-[#F5EDF1] flex items-center justify-center mb-4">
            {isArchivedView ? (
              <Archive size={24} className="text-[#B5648A]" />
            ) : (
              <Users size={24} className="text-[#B5648A]" />
            )}
          </div>
          <p className="text-[#6B3A5E] font-medium">
            {search
              ? `No ${isArchivedView ? 'archived ' : ''}clients match your search`
              : isArchivedView
              ? 'No archived clients'
              : 'No active clients yet'}
          </p>
          <p className="text-sm text-[#8B7080] mt-1">
            {search
              ? 'Try a different search term'
              : isArchivedView
              ? 'Clients you archive will appear here'
              : 'Clients will appear here once onboarding is complete'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[#E8D8E0]">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Service</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Date Added</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}?from=clients${isArchivedView ? '&view=archived' : ''}`} className="contents">
                  <tr className="border-b border-[#E8D8E0]/50 hover:bg-[#FDF8F5] cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {client.first_name[0]}{client.last_name[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#5C4A42] text-sm truncate">
                            {client.first_name} {client.last_name}
                          </p>
                          <p className="text-xs text-[#8B7080] truncate">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8B7080]">
                      {client.service_type ? SERVICE_TYPE_LABELS[client.service_type] : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8B7080]">
                      {client.phone ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8B7080]">
                      {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`rounded-full text-xs px-2.5 py-0.5 font-medium border-0 ${
                          isArchivedView
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {isArchivedView ? 'Archived' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Sparkles size={24} className="text-[#B5648A] animate-pulse" />
        </div>
      }
    >
      <ClientsPageInner />
    </Suspense>
  );
}

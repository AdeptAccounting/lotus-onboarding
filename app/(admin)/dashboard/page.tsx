'use client';

import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { AddClientDialog } from '@/components/admin/add-client-dialog';
import { STATUS_LABELS, STATUS_COLORS, SERVICE_TYPE_LABELS, type ClientStatus } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (!clients) return [];
    let result = clients;
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [clients, search, statusFilter]);

  const stats = useMemo(() => {
    if (!clients) return { total: 0, active: 0, pending: 0 };
    return {
      total: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      pending: clients.filter((c) => !['active', 'archived'].includes(c.status)).length,
    };
  }, [clients]);

  const statusOptions: (ClientStatus | 'all')[] = [
    'all', 'new_lead', 'packet1_sent', 'packet1_submitted', 'packet1_approved',
    'contract_sent', 'contract_signed', 'payment_pending', 'active', 'archived',
  ];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#6B3A5E]">Client Dashboard</h1>
          <p className="text-sm text-[#8B7080] mt-1">Manage your onboarding pipeline</p>
        </div>
        <AddClientDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5EDF1] flex items-center justify-center">
              <Users size={18} className="text-[#B5648A]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#6B3A5E]">{stats.total}</p>
              <p className="text-xs text-[#8B7080]">Total Clients</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#6B3A5E]">{stats.active}</p>
              <p className="text-xs text-[#8B7080]">Active Clients</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#6B3A5E]">{stats.pending}</p>
              <p className="text-xs text-[#8B7080]">In Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7080]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 rounded-xl border-[#E8D8E0] bg-white focus:border-[#B5648A]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                statusFilter === status
                  ? 'bg-[#B5648A] text-white shadow-sm'
                  : 'bg-white text-[#8B7080] hover:bg-[#F5EDF1] border border-[#E8D8E0]'
              }`}
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
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
            <Users size={24} className="text-[#B5648A]" />
          </div>
          <p className="text-[#6B3A5E] font-medium">No clients yet</p>
          <p className="text-sm text-[#8B7080] mt-1">Add your first client to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8D8E0]/50 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#E8D8E0]">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Service</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#8B7080] uppercase tracking-wider">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}?from=dashboard`} className="contents">
                  <tr className="border-b border-[#E8D8E0]/50 hover:bg-[#FDF8F5] cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4A0BB] to-[#B5648A] flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {client.first_name[0]}{client.last_name[0]}
                          </span>
                        </div>
                        <span className="font-medium text-[#5C4A42] text-sm">
                          {client.first_name} {client.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8B7080]">{client.email}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${STATUS_COLORS[client.status]} rounded-full text-xs px-2.5 py-0.5 font-medium border-0`}>
                        {STATUS_LABELS[client.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8B7080]">
                      {client.service_type ? SERVICE_TYPE_LABELS[client.service_type] : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8B7080]">
                      {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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

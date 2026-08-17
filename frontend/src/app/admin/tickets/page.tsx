"use client";

import { TicketTable } from "@/components/admin/TicketTable";
import { useTickets } from "@/hooks/useTickets";

export default function AdminTicketsPage() {
  const { tickets, loading, updateTicket } = useTickets();

  const handleUpdateStatus = async (ticketId: number, status: string) => {
    await updateTicket(ticketId, { status });
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold text-white">Escalation Tickets</h2>
        <p className="text-sm text-gray-400 mt-1">Manage queries that couldn&apos;t be answered automatically</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-red-400">{openCount}</p>
          <p className="text-xs text-gray-500">Open</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-amber-400">{inProgressCount}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
          <p className="text-xs text-gray-500">Resolved</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <TicketTable tickets={tickets} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
}

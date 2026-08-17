"use client";

import { AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Ticket } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

interface TicketTableProps {
  tickets: Ticket[];
  onUpdateStatus: (id: number, status: string) => void;
}

const statusConfig = {
  open: { variant: "danger" as const, icon: AlertTriangle, label: "Open" },
  in_progress: { variant: "warning" as const, icon: Clock, label: "In Progress" },
  resolved: { variant: "success" as const, icon: CheckCircle, label: "Resolved" },
};

export function TicketTable({ tickets, onUpdateStatus }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/5">
        <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No escalation tickets</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Query</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.map((ticket) => {
              const config = statusConfig[ticket.status];
              const StatusIcon = config.icon;

              return (
                <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400">#{ticket.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-200 max-w-md">{truncate(ticket.query, 80)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={config.variant} className="gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{ticket.department || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(ticket.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {ticket.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateStatus(ticket.id, "in_progress")}
                          className="text-xs h-7"
                        >
                          Start
                        </Button>
                      )}
                      {ticket.status === "in_progress" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateStatus(ticket.id, "resolved")}
                          className="text-xs h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          Resolve
                        </Button>
                      )}
                      {ticket.status === "resolved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateStatus(ticket.id, "open")}
                          className="text-xs h-7 text-gray-500"
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

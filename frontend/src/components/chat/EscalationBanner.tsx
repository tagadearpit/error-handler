"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";

interface EscalationBannerProps {
  ticketId: number;
  message: string;
}

export function EscalationBanner({ ticketId, message }: EscalationBannerProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-200">Escalated to Support Team</p>
          <p className="text-xs text-amber-300/70 mt-1">{message}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/20">
              Ticket #{ticketId}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

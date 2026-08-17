"use client";

import { FileText } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationPillProps {
  citation: Citation;
  onClick: () => void;
}

export function CitationPill({ citation, onClick }: CitationPillProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 rounded-full text-[11px] text-violet-300 hover:text-violet-200 transition-all duration-150 group"
    >
      <FileText className="w-3 h-3 opacity-70 group-hover:opacity-100" />
      <span className="truncate max-w-[120px]">{citation.document_title}</span>
      {citation.page_number && (
        <span className="text-violet-400/60">p.{citation.page_number}</span>
      )}
    </button>
  );
}

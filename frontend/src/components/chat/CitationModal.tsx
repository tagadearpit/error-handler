"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Hash } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationModalProps {
  citation: Citation | null;
  open: boolean;
  onClose: () => void;
}

export function CitationModal({ citation, open, onClose }: CitationModalProps) {
  if (!citation) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            {citation.document_title}
          </DialogTitle>
          <DialogDescription>
            Source document excerpt used to generate the response
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs">
            {citation.page_number && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20">
                <Hash className="w-3 h-3" />
                Page {citation.page_number}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 text-sky-300 rounded-full border border-sky-500/20">
              Doc ID: {citation.document_id}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20">
              Chunk #{citation.chunk_id}
            </span>
          </div>

          {/* Quote */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Extracted Content</p>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {citation.quote}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { FileText, Trash2, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface DocumentTableProps {
  documents: Document[];
  onDelete: (id: number) => void;
  onReindex: (id: number) => void;
}

const statusVariant = {
  pending: "warning" as const,
  processing: "warning" as const,
  processed: "success" as const,
  failed: "danger" as const,
};

const accessColors: Record<string, string> = {
  public: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  student: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  faculty: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  admin: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  support: "bg-rose-500/10 text-rose-300 border-rose-500/20",
};

export function DocumentTable({ documents, onDelete, onReindex }: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/5">
        <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Document</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Access</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Chunks</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Uploaded</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{doc.title}</p>
                      <p className="text-[10px] text-gray-500">{doc.filename}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${accessColors[doc.access_level] || ""}`}>
                    {doc.access_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Layers className="w-3 h-3" />
                    {doc.chunk_count}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(doc.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onReindex(doc.id)} className="h-7 w-7" title="Re-index">
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(doc.id)} className="h-7 w-7" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

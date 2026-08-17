"use client";

import { FileUpload } from "@/components/admin/FileUpload";
import { DocumentTable } from "@/components/admin/DocumentTable";
import { useDocuments } from "@/hooks/useDocuments";

export default function AdminDocumentsPage() {
  const { documents, loading, uploadDocument, deleteDocument, reindexDocument } = useDocuments();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold text-white">Document Management</h2>
        <p className="text-sm text-gray-400 mt-1">Upload, manage, and re-index knowledge base documents</p>
      </div>

      <FileUpload
        onUpload={async (file, title, accessLevel, department) => {
          await uploadDocument(file, title, accessLevel, department);
        }}
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">
            All Documents ({documents.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <DocumentTable
            documents={documents}
            onDelete={deleteDocument}
            onReindex={reindexDocument}
          />
        )}
      </div>
    </div>
  );
}

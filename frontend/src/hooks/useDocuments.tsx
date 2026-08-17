"use client";

import { useState, useCallback, useEffect } from "react";
import { apiGetDocuments, apiUploadDocument, apiDeleteDocument, apiReindexDocument } from "@/lib/api";
import type { Document } from "@/lib/types";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetDocuments();
      setDocuments(res.documents);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, [fetchDocuments]);

  // Polling for document ingestion
  useEffect(() => {
    const hasActiveTasks = documents.some(
      (d) => d.status === "pending" || d.status === "processing"
    );
    if (!hasActiveTasks) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const uploadDocument = useCallback(
    async (file: File, title: string, accessLevel: string, department?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("access_level", accessLevel);
      if (department) formData.append("department", department);

      const doc = await apiUploadDocument(formData);
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    },
    [],
  );

  const deleteDocument = useCallback(async (docId: number) => {
    await apiDeleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  const reindexDocument = useCallback(async (docId: number) => {
    const updated = await apiReindexDocument(docId);
    setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
  }, []);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    reindexDocument,
  };
}

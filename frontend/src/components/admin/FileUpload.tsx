"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (file: File, title: string, accessLevel: string, department?: string) => Promise<void>;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState("public");
  const [department, setDepartment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async () => {
    if (!file || !title) return;
    setUploading(true);
    setStatus("idle");
    try {
      await onUpload(file, title, accessLevel, department || undefined);
      setStatus("success");
      setFile(null);
      setTitle("");
      setDepartment("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Upload className="w-4 h-4 text-violet-400" />
        Upload Document
      </h3>

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          dragOver
            ? "border-violet-500 bg-violet-500/10"
            : file
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-300">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              Drop a file here or <span className="text-violet-400">browse</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">PDF, DOCX, TXT, Markdown (max 50MB)</p>
          </>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <label className="text-xs text-gray-400 mb-1 block">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Access Level</label>
          <select
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="public">Public</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
            <option value="support">Support</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Department</label>
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={!file || !title || uploading}>
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload & Index
            </>
          )}
        </Button>
        {status === "success" && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Uploaded successfully
          </span>
        )}
        {status === "error" && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="w-4 h-4" /> Upload failed
          </span>
        )}
      </div>
    </div>
  );
}

// src/app/(dashboard)/trash/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { FileRow } from "@/lib/db/schema";
import { FileCard } from "@/components/dashboard/FileCard";
import { useToast } from "@/components/providers/ToastProvider";
import { Trash2, RefreshCw } from "lucide-react";

export default function TrashPage() {
  const { toast } = useToast();
  const [trashedFiles, setTrashedFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files?deleted=true");
      if (res.ok) {
        const data = await res.json();
        setTrashedFiles(data.data.files || []);
      }
    } catch {
      toast("Failed to load trash", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleEmptyTrash = async () => {
    if (trashedFiles.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete all ${trashedFiles.length} files in Trash? This cannot be undone.`
      )
    ) {
      return;
    }

    setClearing(true);
    try {
      for (const file of trashedFiles) {
        await fetch(`/api/files/${file.id}/permanent-delete`, {
          method: "DELETE",
        });
      }
      toast("Trash emptied successfully", "success");
      fetchTrash();
    } catch {
      toast("Error emptying trash", "error");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-red-500" />
            Trash
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Files in trash will be permanently deleted after 30 days.
          </p>
        </div>

        {trashedFiles.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {clearing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Empty Trash
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 skeleton rounded-2xl" />
          ))}
        </div>
      ) : trashedFiles.length === 0 ? (
        <div className="text-center py-24 bg-card/40 border border-border rounded-2xl">
          <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-base">Trash is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Items moved to trash will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trashedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onUpdate={fetchTrash}
              isTrash={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// src/app/(dashboard)/trash/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { FileRow } from "@/lib/db/schema";
import { FileCard } from "@/components/dashboard/FileCard";
import { BatchActionBar } from "@/components/dashboard/BatchActionBar";
import { useToast } from "@/components/providers/ToastProvider";
import { Trash2, RefreshCw, Check } from "lucide-react";

export default function TrashPage() {
  const { toast } = useToast();
  const [trashedFiles, setTrashedFiles] = useState<FileRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files?deleted=true");
      if (res.ok) {
        const data = await res.json();
        setTrashedFiles(data.data.files || []);
        setSelectedIds([]);
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    trashedFiles.length > 0 && selectedIds.length === trashedFiles.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trashedFiles.map((f) => f.id));
    }
  };

  const handleClearSelection = () => setSelectedIds([]);

  const selectedFiles = trashedFiles.filter((f) => selectedIds.includes(f.id));
  const totalSelectedBytes = selectedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  const handleBatchRestore = async () => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", fileIds: selectedIds }),
      });
      if (res.ok) {
        toast(`${selectedIds.length} file(s) restored`, "success");
        setSelectedIds([]);
        fetchTrash();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to restore files", "error");
      }
    } catch {
      toast("Error restoring files", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${selectedIds.length} selected file(s)? This cannot be undone.`
      )
    ) {
      return;
    }

    setBatchLoading(true);
    try {
      const res = await fetch("/api/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "permanent-delete", fileIds: selectedIds }),
      });
      if (res.ok) {
        toast(`${selectedIds.length} file(s) permanently deleted`, "success");
        setSelectedIds([]);
        fetchTrash();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to delete files", "error");
      }
    } catch {
      toast("Error permanently deleting files", "error");
    } finally {
      setBatchLoading(false);
    }
  };

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
      const res = await fetch("/api/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "permanent-delete",
          fileIds: trashedFiles.map((f) => f.id),
        }),
      });
      if (res.ok) {
        toast("Trash emptied successfully", "success");
        setSelectedIds([]);
        fetchTrash();
      } else {
        toast("Error emptying trash", "error");
      }
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
            disabled={clearing || batchLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-sm font-semibold transition-all shadow-md shadow-rose-600/25 active:scale-95 disabled:opacity-50"
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

      {/* Select All & Selection Header */}
      {trashedFiles.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isAllSelected
                  ? "border-theme-accent bg-theme-soft text-theme-accent shadow-xs"
                  : selectedIds.length > 0
                  ? "border-theme-accent/60 bg-theme-soft/50 text-foreground"
                  : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={isAllSelected ? "Deselect All files" : "Select All files"}
            >
              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                  isAllSelected
                    ? "bg-theme-gradient text-white shadow-xs"
                    : selectedIds.length > 0
                    ? "bg-theme-gradient text-white"
                    : "border border-slate-400/80"
                }`}
              >
                {isAllSelected ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : selectedIds.length > 0 ? (
                  <div className="w-2 h-0.5 bg-white rounded-full" />
                ) : null}
              </div>
              <span>
                {isAllSelected
                  ? "Deselect All"
                  : selectedIds.length > 0
                  ? `Selected (${selectedIds.length}/${trashedFiles.length})`
                  : `Select All (${trashedFiles.length})`}
              </span>
            </button>
          </div>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

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
              files={trashedFiles}
              onUpdate={fetchTrash}
              isTrash={true}
              selected={selectedIds.includes(file.id)}
              onToggleSelect={handleToggleSelect}
              selectionMode={selectedIds.length > 0}
            />
          ))}
        </div>
      )}

      {/* Floating Batch Actions Bar for Trash */}
      <BatchActionBar
        selectedCount={selectedIds.length}
        totalCount={trashedFiles.length}
        totalBytes={totalSelectedBytes}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onRestoreSelected={handleBatchRestore}
        onPermanentDeleteSelected={handleBatchPermanentDelete}
        isTrash={true}
        loading={batchLoading}
      />
    </div>
  );
}

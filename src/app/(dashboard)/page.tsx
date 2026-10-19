// src/app/(dashboard)/page.tsx — Main Dashboard
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatBytes } from "@/lib/utils";
import { FileRow } from "@/lib/db/schema";
import { FileCard } from "@/components/dashboard/FileCard";
import { UploadZone } from "@/components/dashboard/UploadZone";
import { BatchActionBar } from "@/components/dashboard/BatchActionBar";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Files, HardDrive, TrendingUp, Clock, Upload, ChevronRight, Check
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recentFiles, setRecentFiles] = useState<FileRow[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/files?sortBy=createdAt&sortOrder=desc&pageSize=8");
      if (res.ok) {
        const data = await res.json();
        setRecentFiles(data.data.files);
        setTotalFiles(data.data.files.length);
      }
    } catch {
      toast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    recentFiles.length > 0 && selectedIds.length === recentFiles.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recentFiles.map((f) => f.id));
    }
  };

  const handleClearSelection = () => setSelectedIds([]);

  const selectedFiles = recentFiles.filter((f) => selectedIds.includes(f.id));
  const totalSelectedBytes = selectedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  const handleBatchDownload = () => {
    if (selectedFiles.length === 0) return;
    toast(`Starting download of ${selectedFiles.length} file(s)...`, "info");
    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/files/${file.id}/download`;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
  };

  const handleBatchTrash = async () => {
    if (!confirm(`Move ${selectedIds.length} selected file(s) to trash?`)) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trash", fileIds: selectedIds }),
      });
      if (res.ok) {
        toast(`${selectedIds.length} file(s) moved to trash`, "success");
        setSelectedIds([]);
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to move files to trash", "error");
      }
    } catch {
      toast("Error moving files to trash", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const usedPercent = user
    ? Math.min(100, (user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.email.split("@")[0]}! Here&apos;s your storage overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Files */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-theme-soft text-theme-accent flex items-center justify-center">
              <Files className="w-5 h-5 text-theme-accent" />
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Files</span>
          </div>
          <div className="text-3xl font-bold">{loading ? "—" : totalFiles}</div>
          <p className="text-sm text-muted-foreground mt-1">Total uploaded files</p>
        </div>

        {/* Storage Used */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-theme-soft text-theme-accent flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-theme-accent" />
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Storage</span>
          </div>
          <div className="text-3xl font-bold">
            {user ? formatBytes(user.storageUsedBytes) : "—"}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Used</span>
              <span>{user ? formatBytes(user.storageQuotaBytes) : ""} total</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-gradient rounded-full transition-all duration-700"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Remaining Quota */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Available</span>
          </div>
          <div className="text-3xl font-bold">
            {user ? formatBytes(user.storageQuotaBytes - user.storageUsedBytes) : "—"}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Remaining storage ({Math.round(100 - usedPercent)}% free)
          </p>
        </div>
      </div>

      {/* Quick Upload */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-theme-accent" />
          Quick Upload
        </h2>
        <UploadZone onUploadComplete={fetchData} />
      </div>

      {/* Recent Files */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Recent Files
            </h2>

            {recentFiles.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
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
                    ? `Selected (${selectedIds.length}/${recentFiles.length})`
                    : "Select All"}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Clear selection
              </button>
            )}
            <Link
              href="/files"
              className="text-sm text-theme-accent hover:underline font-medium flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 skeleton" />
            ))}
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Files className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No files yet</p>
            <p className="text-sm mt-1">Upload your first file to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                files={recentFiles}
                onUpdate={fetchData}
                selected={selectedIds.includes(file.id)}
                onToggleSelect={handleToggleSelect}
                selectionMode={selectedIds.length > 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Batch Actions Bar */}
      <BatchActionBar
        selectedCount={selectedIds.length}
        totalCount={recentFiles.length}
        totalBytes={totalSelectedBytes}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onDownloadSelected={handleBatchDownload}
        onDeleteSelected={handleBatchTrash}
        loading={batchLoading}
      />
    </div>
  );
}

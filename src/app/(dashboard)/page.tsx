// src/app/(dashboard)/page.tsx — Main Dashboard
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatBytes } from "@/lib/utils";
import { FileRow } from "@/lib/db/schema";
import { FileCard } from "@/components/dashboard/FileCard";
import { UploadZone } from "@/components/dashboard/UploadZone";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Files, HardDrive, TrendingUp, Clock, Upload, ChevronRight
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Files className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Files</span>
          </div>
          <div className="text-3xl font-bold">{loading ? "—" : totalFiles}</div>
          <p className="text-sm text-muted-foreground mt-1">Total uploaded files</p>
        </div>

        {/* Storage Used */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-purple-500" />
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
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Remaining Quota */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
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
          <Upload className="w-5 h-5 text-blue-500" />
          Quick Upload
        </h2>
        <UploadZone onUploadComplete={fetchData} />
      </div>

      {/* Recent Files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Files
          </h2>
          <Link
            href="/files"
            className="text-sm text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
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
              <FileCard key={file.id} file={file} onUpdate={fetchData} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

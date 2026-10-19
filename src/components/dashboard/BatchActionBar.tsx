// src/components/dashboard/BatchActionBar.tsx
"use client";

import { formatBytes } from "@/lib/utils";
import {
  CheckSquare,
  Square,
  Download,
  Trash2,
  RotateCcw,
  X,
  Loader2,
  Check,
} from "lucide-react";

interface BatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  totalBytes?: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onDownloadSelected?: () => void;
  onDeleteSelected?: () => void;
  onRestoreSelected?: () => void;
  onPermanentDeleteSelected?: () => void;
  isTrash?: boolean;
  loading?: boolean;
}

export function BatchActionBar({
  selectedCount,
  totalCount,
  totalBytes = 0,
  isAllSelected,
  onToggleSelectAll,
  onClearSelection,
  onDownloadSelected,
  onDeleteSelected,
  onRestoreSelected,
  onPermanentDeleteSelected,
  isTrash = false,
  loading = false,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92vw] sm:w-auto animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl text-slate-100">
        {/* Selection Count & Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center gap-2 text-xs font-semibold hover:text-white transition-colors"
            title={isAllSelected ? "Deselect All" : "Select All"}
          >
            <div className="w-5 h-5 rounded-md bg-theme-gradient flex items-center justify-center text-white shadow-xs">
              {isAllSelected ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <div className="w-2 h-2 bg-white rounded-sm" />
              )}
            </div>
            <span>
              {selectedCount} of {totalCount} selected
            </span>
          </button>

          {totalBytes > 0 && (
            <span className="hidden sm:inline text-xs text-slate-400">
              ({formatBytes(totalBytes)})
            </span>
          )}
        </div>

        <div className="h-5 w-px bg-white/15 hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isTrash ? (
            <>
              {onDownloadSelected && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onDownloadSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all disabled:opacity-50"
                  title="Download all selected files"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download</span>
                </button>
              )}

              {onDeleteSelected && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Move selected files to trash"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Move to Trash</span>
                </button>
              )}
            </>
          ) : (
            <>
              {onRestoreSelected && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onRestoreSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Restore selected files"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Restore ({selectedCount})</span>
                </button>
              )}

              {onPermanentDeleteSelected && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onPermanentDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Permanently delete selected files"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Forever</span>
                </button>
              )}
            </>
          )}

          <div className="h-5 w-px bg-white/15" />

          {/* Clear selection */}
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

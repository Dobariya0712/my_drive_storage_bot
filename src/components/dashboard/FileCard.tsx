// src/components/dashboard/FileCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { FileRow } from "@/lib/db/schema";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { useFileViewer } from "@/components/providers/FileViewerProvider";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Edit2,
  RotateCcw,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FileCardProps {
  file: FileRow;
  files?: FileRow[];
  onUpdate?: () => void;
  compact?: boolean;
  isTrash?: boolean;
}

function getFileIcon(mimeType: string, filename: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-6 h-6 text-emerald-400" />;
  if (mimeType.startsWith("video/")) return <Video className="w-6 h-6 text-purple-400" />;
  if (mimeType.startsWith("audio/")) return <Music className="w-6 h-6 text-pink-400" />;
  if (mimeType.includes("pdf")) return <FileText className="w-6 h-6 text-rose-400" />;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  ) {
    return <Archive className="w-6 h-6 text-amber-400" />;
  }
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("typescript") ||
    filename.endsWith(".ts") ||
    filename.endsWith(".js") ||
    filename.endsWith(".py")
  ) {
    return <Code className="w-6 h-6 text-cyan-400" />;
  }
  return <File className="w-6 h-6 text-blue-400" />;
}

export function FileCard({
  file,
  files = [],
  onUpdate,
  compact = false,
  isTrash = false,
}: FileCardProps) {
  const { toast } = useToast();
  const { openFile } = useFileViewer();

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.originalName);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isImage = file.mimeType.startsWith("image/");

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handlePreview = () => {
    if (isTrash) return;
    openFile(file, files);
  };

  const handleDownload = () => {
    window.open(`/api/files/${file.id}/download`, "_blank");
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === file.originalName) {
      setRenaming(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        toast("File renamed", "success");
        setRenaming(false);
        onUpdate?.();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to rename", "error");
      }
    } catch {
      toast("Error renaming file", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(isTrash ? "Permanently delete this file?" : "Move file to trash?")) return;
    setLoading(true);
    try {
      const endpoint = isTrash
        ? `/api/files/${file.id}/permanent-delete`
        : `/api/files/${file.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        toast(isTrash ? "File deleted permanently" : "Moved to trash", "success");
        onUpdate?.();
      } else {
        const err = await res.json();
        toast(err.error || "Delete failed", "error");
      }
    } catch {
      toast("Error deleting file", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${file.id}/restore`, { method: "POST" });
      if (res.ok) {
        toast("File restored", "success");
        onUpdate?.();
      } else {
        const err = await res.json();
        toast(err.error || "Restore failed", "error");
      }
    } catch {
      toast("Error restoring file", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(`${window.location.origin}/share/${data.data.token}`);
        setShareModalOpen(true);
      } else {
        const err = await res.json();
        toast(err.error || "Failed to create share link", "error");
      }
    } catch {
      toast("Error sharing file", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast("Link copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="group relative bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all hover:border-border/80 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            {/* Thumbnail or File Icon */}
            {isImage && !thumbError ? (
              <div
                onClick={!isTrash ? handlePreview : undefined}
                className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform border border-border/50 shadow-xs"
                title="Click to preview in internal browser"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${file.id}/download?inline=true`}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setThumbError(true)}
                />
              </div>
            ) : (
              <div
                onClick={!isTrash ? handlePreview : undefined}
                className={`w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 ${
                  !isTrash ? "cursor-pointer hover:scale-105 transition-transform" : ""
                }`}
                title={!isTrash ? "Click to open in internal browser" : undefined}
              >
                {getFileIcon(file.mimeType, file.originalName)}
              </div>
            )}

            {isTrash ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:scale-[1.02] active:scale-95 transition-all shadow-xs"
                  title="Restore File"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:scale-[1.02] active:scale-95 transition-all shadow-xs"
                  title="Delete Forever"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div className="relative menu-container" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors opacity-80 group-hover:opacity-100"
                  aria-label="Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-8 z-50 w-44 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 backdrop-blur-2xl text-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handlePreview();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors font-medium text-theme-accent"
                    >
                      <Eye className="w-3.5 h-3.5 text-theme-accent" /> Preview / Open
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handleDownload();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors font-medium"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" /> Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handleShare();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors font-medium"
                    >
                      <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Share
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        setRenaming(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" /> Rename
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/15 text-left transition-colors font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {renaming ? (
            <form onSubmit={handleRename} className="my-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full px-2 py-1 text-sm bg-muted border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-2.5 py-1 text-xs bg-theme-gradient text-white rounded-md shadow-xs"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="px-2.5 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-2">
              <h3
                title={`Open "${file.originalName}"`}
                onClick={!isTrash ? handlePreview : undefined}
                className={`font-semibold text-sm truncate ${
                  !isTrash ? "cursor-pointer hover:text-theme-accent transition-colors" : ""
                }`}
              >
                {file.originalName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatBytes(file.sizeBytes)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
          <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
          {isTrash ? (
            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              In Trash
            </span>
          ) : !compact ? (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview();
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-foreground transition-colors"
                title="Preview in Internal Browser"
              >
                <Eye className="w-3.5 h-3.5 text-theme-accent" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-foreground transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-foreground transition-colors"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold mb-2">Share File</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Anyone with this link can view and download &ldquo;{file.originalName}&rdquo;.
            </p>

            <div className="flex items-center gap-2 bg-muted p-2 rounded-xl mb-6">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-sm w-full outline-none text-foreground select-all px-2"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-gradient text-white rounded-lg text-xs font-medium shrink-0 transition-colors shadow-sm shadow-theme-glow"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

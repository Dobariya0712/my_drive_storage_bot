// src/components/dashboard/FileCard.tsx
"use client";

import { useState } from "react";
import { FileRow } from "@/lib/db/schema";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FileCardProps {
  file: FileRow;
  onUpdate?: () => void;
  compact?: boolean;
  isTrash?: boolean;
}

function getFileIcon(mimeType: string, filename: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-6 h-6 text-emerald-500" />;
  if (mimeType.startsWith("video/")) return <Video className="w-6 h-6 text-purple-500" />;
  if (mimeType.startsWith("audio/")) return <Music className="w-6 h-6 text-pink-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-6 h-6 text-red-500" />;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  ) {
    return <Archive className="w-6 h-6 text-amber-500" />;
  }
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("typescript") ||
    filename.endsWith(".ts") ||
    filename.endsWith(".js") ||
    filename.endsWith(".py")
  ) {
    return <Code className="w-6 h-6 text-cyan-500" />;
  }
  return <File className="w-6 h-6 text-blue-500" />;
}

export function FileCard({ file, onUpdate, compact = false, isTrash = false }: FileCardProps) {
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.originalName);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

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
            <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
              {getFileIcon(file.mimeType, file.originalName)}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors opacity-80 group-hover:opacity-100"
                aria-label="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-40 w-44 bg-popover border border-border rounded-xl shadow-lg py-1 text-sm animate-scale-in">
                    {!isTrash ? (
                      <>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleDownload();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                        >
                          <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleShare();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                        >
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setRenaming(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                        >
                          <Edit2 className="w-4 h-4" /> Rename
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleDelete();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-500 text-left"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleRestore();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-green-500"
                        >
                          <RotateCcw className="w-4 h-4" /> Restore
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleDelete();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-500 text-left"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Forever
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {renaming ? (
            <form onSubmit={handleRename} className="my-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full px-2 py-1 text-sm bg-muted border border-border rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
                title={file.originalName}
                onClick={!isTrash ? handleDownload : undefined}
                className={`font-semibold text-sm truncate ${
                  !isTrash ? "cursor-pointer hover:text-blue-500" : ""
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
          {!isTrash && !compact && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleDownload}
                className="p-1 hover:bg-muted rounded text-foreground"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-1 hover:bg-muted rounded text-foreground"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shrink-0 transition-colors"
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

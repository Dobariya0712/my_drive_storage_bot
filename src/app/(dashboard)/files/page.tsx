// src/app/(dashboard)/files/page.tsx
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileRow, FolderRow } from "@/lib/db/schema";
import { FileCard } from "@/components/dashboard/FileCard";
import { UploadZone } from "@/components/dashboard/UploadZone";
import { useToast } from "@/components/providers/ToastProvider";
import {
  FolderPlus,
  Upload,
  Search,
  Folder,
  ArrowUpDown,
  Grid,
  List,
  ChevronRight,
  Files,
  X,
  Trash2,
} from "lucide-react";

function FilesContent() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");
  const { toast } = useToast();

  const [files, setFiles] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "sizeBytes">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch files
      let filesUrl = `/api/files?sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (currentFolderId) {
        filesUrl += `&folderId=${currentFolderId}`;
      }
      if (search) {
        filesUrl += `&search=${encodeURIComponent(search)}`;
      }
      const filesRes = await fetch(filesUrl);
      if (filesRes.ok) {
        const data = await filesRes.json();
        let fetchedFiles: FileRow[] = data.data.files || [];
        if (typeFilter) {
          fetchedFiles = fetchedFiles.filter((f) => {
            if (typeFilter === "image") return f.mimeType.startsWith("image/");
            if (typeFilter === "video") return f.mimeType.startsWith("video/");
            if (typeFilter === "document")
              return (
                f.mimeType.includes("pdf") ||
                f.mimeType.includes("document") ||
                f.mimeType.includes("text")
              );
            return true;
          });
        }
        setFiles(fetchedFiles);
      }

      // Fetch folders
      let foldersUrl = `/api/folders`;
      if (currentFolderId) {
        foldersUrl += `?parentFolderId=${currentFolderId}`;
      }
      const foldersRes = await fetch(foldersUrl);
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.data || []);
      }
    } catch {
      toast("Failed to load files", "error");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, search, sortBy, sortOrder, typeFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolderId: currentFolderId,
        }),
      });

      if (res.ok) {
        toast(`Folder "${newFolderName}" created`, "success");
        setNewFolderName("");
        setNewFolderOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to create folder", "error");
      }
    } catch {
      toast("Error creating folder", "error");
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folderName}" and all its contents?`)) return;

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast(`Folder deleted`, "success");
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to delete folder", "error");
      }
    } catch {
      toast("Error deleting folder", "error");
    }
  };

  const enterFolder = (folder: FolderRow) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const target = folderPath[index];
      setCurrentFolderId(target.id);
      setFolderPath((prev) => prev.slice(0, index + 1));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {typeFilter ? `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}s` : "My Files"}
          </h1>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 flex-wrap">
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className="hover:text-foreground font-medium"
            >
              All Files
            </button>
            {folderPath.map((item, index) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`hover:text-foreground ${
                    index === folderPath.length - 1 ? "text-foreground font-semibold" : ""
                  }`}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-muted-foreground" />
            New Folder
          </button>
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-gradient hover:opacity-90 text-white text-sm font-semibold transition-all shadow-md shadow-theme-glow active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>
      </div>

      {/* Upload Dropdown / Expand */}
      {uploadOpen && (
        <div className="bg-card border border-border rounded-2xl p-6 relative animate-scale-in">
          <button
            onClick={() => setUploadOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold mb-3">Upload to {folderPath.length ? folderPath[folderPath.length - 1].name : "Root"}</h2>
          <UploadZone
            folderId={currentFolderId}
            onUploadComplete={() => {
              fetchData();
            }}
          />
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-") as [
                  "createdAt" | "name" | "sizeBytes",
                  "asc" | "desc"
                ];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="bg-transparent outline-none text-xs text-foreground cursor-pointer"
            >
              <option value="createdAt-desc">Newest first</option>
              <option value="createdAt-asc">Oldest first</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="sizeBytes-desc">Size (Largest)</option>
              <option value="sizeBytes-asc">Size (Smallest)</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"}`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg ${viewMode === "list" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateFolder}
            className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in"
          >
            <h3 className="text-lg font-bold mb-3">Create New Folder</h3>
            <input
              type="text"
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewFolderOpen(false)}
                className="px-4 py-2 text-sm bg-muted rounded-xl hover:bg-muted/80 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-theme-gradient hover:opacity-90 text-white rounded-xl font-medium shadow-theme-glow"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Folders
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => enterFolder(folder)}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:border-theme-accent hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Folder className="w-5 h-5 fill-amber-500/20" />
                  </div>
                  <span className="font-medium text-sm truncate">{folder.name}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-red-500 rounded-lg transition-opacity"
                  title="Delete Folder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Files ({files.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 skeleton rounded-2xl" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 bg-card/40 border border-border rounded-2xl">
            <Files className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-base">No files here yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Upload files or drag and drop into this folder
            </p>
            <button
              onClick={() => setUploadOpen(true)}
              className="px-5 py-2.5 bg-theme-gradient hover:opacity-90 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-md shadow-theme-glow active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" /> Upload Now
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <FileCard key={file.id} file={file} files={files} onUpdate={fetchData} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <FileCard key={file.id} file={file} files={files} onUpdate={fetchData} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="h-96 skeleton rounded-2xl" />}>
      <FilesContent />
    </Suspense>
  );
}

// src/components/dashboard/UploadZone.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, FileUp } from "lucide-react";
import { formatBytes, MAX_FILE_SIZE_BYTES } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

interface UploadZoneProps {
  folderId?: string | null;
  onUploadComplete?: () => void;
}

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export function UploadZone({ folderId, onUploadComplete }: UploadZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processQueueItem = async (item: UploadQueueItem) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 10 } : q))
    );

    try {
      const formData = new FormData();
      formData.append("file", item.file);
      if (folderId) {
        formData.append("folderId", folderId);
      }

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 90);
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: pct } : q))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, status: "success", progress: 100 } : q))
            );
            resolve();
          } else {
            let errorMsg = "Upload failed";
            try {
              const res = JSON.parse(xhr.responseText);
              errorMsg = res.error || errorMsg;
            } catch {
              // ignore json parse error
            }
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", "/api/files");
        xhr.send(formData);
      });

      toast(`Uploaded ${item.file.name}`, "success");
      onUploadComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "error", errorMessage: msg } : q))
      );
      toast(msg, "error");
    }
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileList = Array.from(files);
      const newItems: UploadQueueItem[] = [];

      for (const file of fileList) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast(
            `${file.name} exceeds the 50 MB limit (${formatBytes(file.size)})`,
            "error"
          );
          continue;
        }

        const item: UploadQueueItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          progress: 0,
          status: "pending",
        };
        newItems.push(item);
      }

      if (newItems.length > 0) {
        setQueue((prev) => [...prev, ...newItems]);
        // Process sequentially
        newItems.forEach((item) => {
          processQueueItem(item);
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folderId, onUploadComplete, toast]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-500/5 scale-[0.99]"
            : "border-border hover:border-muted-foreground/40 bg-card hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
            }
          }}
        />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-base">
              Click to upload or drag & drop
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports any file up to {formatBytes(MAX_FILE_SIZE_BYTES)} (Telegram storage limit)
            </p>
          </div>
        </div>
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-sm"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                <FileUp className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="truncate font-medium">{item.file.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  {item.status === "uploading" && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-red-500 truncate">
                      {item.errorMessage || "Upload failed"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.status === "uploading" && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
                {item.status === "success" && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQueueItem(item.id);
                  }}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

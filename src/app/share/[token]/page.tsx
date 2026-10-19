// src/app/share/[token]/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatBytes } from "@/lib/utils";
import {
  Cloud,
  Download,
  FileText,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Eye,
  Video,
  Music,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface SharedFileInfo {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
}

function ShareContent() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<SharedFileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchFileInfo() {
      try {
        const res = await fetch(`/api/share/${token}?info=true`);
        if (res.ok) {
          const data = await res.json();
          setFile(data.data.file);
        } else {
          setFile({
            id: token,
            originalName: "Shared File",
            sizeBytes: 0,
            mimeType: "application/octet-stream",
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        setError("Unable to retrieve shared file information");
      } finally {
        setLoading(false);
      }
    }

    fetchFileInfo();
  }, [token]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `/api/share/${token}`;
    link.download = file?.originalName || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inlineUrl = `/api/share/${token}?inline=true`;
  const mime = file?.mimeType?.toLowerCase() || "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf") || (file?.originalName.toLowerCase().endsWith(".pdf") ?? false);
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 text-center shadow-2xl transition-all">
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
          <p className="text-sm text-muted-foreground">Loading shared file...</p>
        </div>
      ) : error ? (
        <div className="py-8 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Link Expired or Invalid</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Icon / Image Preview Banner */}
          {isImage ? (
            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-border/80 max-h-72 flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inlineUrl}
                alt={file?.originalName}
                className="max-h-72 w-full object-contain rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-all opacity-90 group-hover:opacity-100"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full View</span>
              </button>
            </div>
          ) : isVideo ? (
            <div className="rounded-2xl overflow-hidden bg-black border border-border">
              <video src={inlineUrl} controls className="w-full max-h-64 rounded-2xl" />
            </div>
          ) : isAudio ? (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-theme-soft text-theme-accent flex items-center justify-center mx-auto">
                <Music className="w-7 h-7" />
              </div>
              <audio src={inlineUrl} controls className="w-full outline-none" />
            </div>
          ) : isPdf ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-soft text-theme-accent text-xs font-semibold hover:opacity-80 transition-opacity"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewOpen ? "Hide PDF Viewer" : "Preview PDF"}</span>
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-theme-soft text-theme-accent flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
          )}

          {/* Embedded PDF Viewer if preview toggled */}
          {isPdf && previewOpen && (
            <div className="w-full h-96 rounded-2xl overflow-hidden border border-border relative animate-fade-in">
              <iframe
                src={`${inlineUrl}#toolbar=1`}
                className="w-full h-full border-0 rounded-2xl"
                title={file?.originalName}
              />
            </div>
          )}

          {/* Full Screen Image Modal if preview toggled */}
          {isImage && previewOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setPreviewOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inlineUrl}
                alt={file?.originalName}
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold truncate px-2 text-foreground" title={file?.originalName}>
              {file?.originalName}
            </h1>
            {file?.sizeBytes ? (
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(file.sizeBytes)} • {file.mimeType}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-theme-gradient hover:opacity-90 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-theme-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-5 h-5" /> Download File
            </button>
            <a
              href={inlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-4 rounded-2xl border border-border hover:bg-muted text-foreground font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" /> Open in New Tab
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            Secured and powered by TeleCloud via Telegram Cloud Storage.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SharePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-6">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-theme-gradient flex items-center justify-center text-white shadow-lg shadow-theme-glow">
            <Cloud className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">TeleCloud</span>
        </Link>
      </header>

      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <Suspense
          fallback={
            <div className="bg-card border border-border rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-theme-accent" />
            </div>
          }
        >
          <ShareContent />
        </Suspense>
      </main>

      <footer className="text-center text-xs text-muted-foreground">
        &copy; 2026 TeleCloud. All rights reserved.
      </footer>
    </div>
  );
}

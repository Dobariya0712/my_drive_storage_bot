// src/app/share/[token]/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatBytes } from "@/lib/utils";
import { Cloud, Download, FileText, AlertCircle, Loader2 } from "lucide-react";
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

  return (
    <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-xl">
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
            <FileText className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold truncate px-2" title={file?.originalName}>
              {file?.originalName}
            </h1>
            {file?.sizeBytes ? (
              <p className="text-sm text-muted-foreground mt-1">
                {formatBytes(file.sizeBytes)}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-5 h-5" /> Download File
            </button>
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
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Cloud className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">TeleCloud</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full my-auto py-12">
        <Suspense
          fallback={
            <div className="bg-card border border-border rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
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

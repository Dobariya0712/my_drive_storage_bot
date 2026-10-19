// src/components/dashboard/FileViewerModal.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FileRow } from "@/lib/db/schema";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import {
  X,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Code as CodeIcon,
  File as FileGenericIcon,
  Loader2,
  AlertCircle,
  WrapText,
} from "lucide-react";

interface FileViewerModalProps {
  file: FileRow | null;
  files?: FileRow[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (file: FileRow) => void;
}

export function FileViewerModal({
  file,
  files = [],
  isOpen,
  onClose,
  onNavigate,
}: FileViewerModalProps) {
  const { toast } = useToast();

  // Viewer state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Text/Code file state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [wrapText, setWrapText] = useState(true);

  // Pan state for zoomed images
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Reset controls when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setImageLoading(true);
    setImageError(false);
    setTextContent(null);
    setTextError(null);
  }, [file?.id]);

  // Determine file type
  const mime = file?.mimeType?.toLowerCase() || "";
  const name = file?.originalName?.toLowerCase() || "";

  const isImage =
    mime.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(name);

  const isPdf =
    mime.includes("pdf") ||
    name.endsWith(".pdf");

  const isVideo =
    mime.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov|mkv)$/i.test(name);

  const isAudio =
    mime.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(name);

  const isCodeOrText =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("xml") ||
    mime.includes("yaml") ||
    /\.(txt|md|json|js|jsx|ts|tsx|css|html|py|sql|sh|env|xml|yml|yaml|csv|log)$/i.test(name);

  // Fetch text file content when viewing code/text
  useEffect(() => {
    if (!file || !isOpen || !isCodeOrText) return;

    let cancelled = false;
    setTextLoading(true);
    setTextError(null);

    fetch(`/api/files/${file.id}/download?inline=true`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load file text");
        return res.text();
      })
      .then((data) => {
        if (!cancelled) {
          setTextContent(data);
          setTextLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTextError(err.message || "Failed to read file");
          setTextLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, isOpen, isCodeOrText]);

  // Navigation: find current index
  const currentIndex = files.findIndex((f) => f.id === file?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(files[currentIndex - 1]);
    }
  }, [hasPrev, onNavigate, files, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(files[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, files, currentIndex]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        if (isImage) handleZoomIn();
      } else if (e.key === "-") {
        if (isImage) handleZoomOut();
      } else if (e.key === "0") {
        if (isImage) handleResetZoom();
      } else if (e.key === "r" || e.key === "R") {
        if (isImage) handleRotate();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, isImage]);

  // Drag handlers for zoomed image panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Actions
  const handleDownload = () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = `/api/files/${file.id}/download`;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast("Download started", "info");
  };

  const handleOpenInNewTab = () => {
    if (!file) return;
    window.open(`/api/files/${file.id}/download?inline=true`, "_blank");
  };

  const handleShare = async () => {
    if (!file) return;
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${window.location.origin}/share/${data.data.token}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast("Share link copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast("Failed to generate share link", "error");
      }
    } catch {
      toast("Error creating share link", "error");
    }
  };

  const copyCode = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast("Code copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !file) return null;

  const inlineUrl = `/api/files/${file.id}/download?inline=true`;

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-xl animate-fade-in select-none text-slate-100"
      onMouseUp={handleMouseUp}
    >
      {/* Top Navigation & Toolbar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-white/10 shrink-0 gap-3 z-20">
        {/* Left: File Info & Index */}
        <div className="flex items-center gap-3 min-w-0 max-w-xl">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-theme-accent">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-emerald-400" />
            ) : isPdf ? (
              <FileText className="w-5 h-5 text-rose-400" />
            ) : isVideo ? (
              <Video className="w-5 h-5 text-purple-400" />
            ) : isAudio ? (
              <Music className="w-5 h-5 text-pink-400" />
            ) : isCodeOrText ? (
              <CodeIcon className="w-5 h-5 text-cyan-400" />
            ) : (
              <FileGenericIcon className="w-5 h-5 text-violet-400" />
            )}
          </div>

          <div className="min-w-0">
            <h2
              className="text-sm font-semibold truncate text-white"
              title={file.originalName}
            >
              {file.originalName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{formatBytes(file.sizeBytes)}</span>
              <span>•</span>
              <span className="uppercase font-mono text-[10px] tracking-wider bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                {file.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
              </span>
              {files.length > 1 && currentIndex >= 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {currentIndex + 1} of {files.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Image / Code Controls */}
        <div className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-30"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-0.5 text-xs font-mono font-medium rounded hover:bg-white/10 text-slate-300"
                title="Reset Zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-30"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-white/15 mx-1" />
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Rotate 90° (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {isCodeOrText && (
            <>
              <button
                onClick={() => setWrapText(!wrapText)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
                  wrapText ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                }`}
                title="Toggle Word Wrap"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span>Wrap</span>
              </button>
              <button
                onClick={copyCode}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Copy file text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </>
          )}

          <div className="w-px h-4 bg-white/15 mx-1" />

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Right: Actions (Share, Download, Open New Tab, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all shadow-sm"
            title="Share file link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-gradient hover:opacity-90 text-white text-xs font-semibold transition-all shadow-theme-glow"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
            title="Close viewer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Preview Container */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-6"
        onMouseMove={handleMouseMove}
      >
        {/* Previous File Button */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 group"
            title="Previous file (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}

        {/* Next File Button */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 group"
            title="Next file (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {/* 1. IMAGE PREVIEW */}
        {isImage && (
          <div
            className={`w-full h-full flex items-center justify-center overflow-hidden ${
              zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            onMouseDown={handleMouseDown}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
                <p className="text-xs text-slate-400">Loading high-resolution preview...</p>
              </div>
            )}

            {imageError ? (
              <div className="text-center p-8 bg-slate-900 border border-white/10 rounded-2xl max-w-sm">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                <h3 className="font-semibold text-base mb-1">Preview Unavailable</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Could not render image preview. You can still download the file.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-theme-gradient text-white text-xs font-semibold rounded-xl"
                >
                  Download Image
                </button>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={inlineUrl}
                alt={file.originalName}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
                }}
                className={`max-w-full max-h-[85vh] object-contain select-none drop-shadow-2xl rounded-lg ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
                draggable={false}
              />
            )}
          </div>
        )}

        {/* 2. PDF PREVIEW */}
        {isPdf && (
          <div className="w-full h-full max-w-6xl flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-white/10 text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                PDF Document Viewer
              </span>
              <button
                onClick={handleOpenInNewTab}
                className="hover:text-white underline text-[11px] flex items-center gap-1"
              >
                Open native PDF viewer <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative min-h-[500px]">
              <iframe
                src={`${inlineUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full border-0 rounded-b-2xl bg-slate-900"
                title={file.originalName}
              />
            </div>
          </div>
        )}

        {/* 3. VIDEO PREVIEW */}
        {isVideo && (
          <div className="max-w-5xl w-full flex flex-col items-center justify-center p-2">
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
              <video
                src={inlineUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[78vh] rounded-2xl outline-none"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* 4. AUDIO PREVIEW */}
        {isAudio && (
          <div className="w-full max-w-md bg-slate-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6 backdrop-blur-2xl">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-theme-gradient flex items-center justify-center shadow-theme-glow animate-pulse">
              <Music className="w-12 h-12 text-white" />
            </div>

            <div>
              <h3 className="text-lg font-bold truncate text-white" title={file.originalName}>
                {file.originalName}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{formatBytes(file.sizeBytes)}</p>
            </div>

            {/* Audio Waveform decorative bars */}
            <div className="flex items-center justify-center gap-1.5 h-10 px-4">
              {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 75, 50, 85].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-theme-accent opacity-80 animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${(i * 0.1).toFixed(1)}s`,
                    animationDuration: "1.2s",
                  }}
                />
              ))}
            </div>

            <div className="w-full pt-2">
              <audio src={inlineUrl} controls autoPlay className="w-full outline-none" />
            </div>
          </div>
        )}

        {/* 5. CODE / TEXT PREVIEW */}
        {isCodeOrText && (
          <div className="w-full max-w-5xl h-[80vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CodeIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-mono">{file.originalName}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                {textContent && (
                  <span>
                    {textContent.split("\n").length} lines • {textContent.length} chars
                  </span>
                )}
                <button
                  onClick={copyCode}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Content"}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
              {textLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-theme-accent" />
                  <span>Loading file content...</span>
                </div>
              ) : textError ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                  <span>{textError}</span>
                </div>
              ) : (
                <pre
                  className={`tab-4 font-mono ${
                    wrapText ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                  }`}
                >
                  <code>{textContent}</code>
                </pre>
              )}
            </div>
          </div>
        )}

        {/* 6. GENERIC / FALLBACK PREVIEW */}
        {!isImage && !isPdf && !isVideo && !isAudio && !isCodeOrText && (
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <FileGenericIcon className="w-10 h-10 text-theme-accent" />
            </div>

            <div>
              <h3 className="text-lg font-bold truncate text-white" title={file.originalName}>
                {file.originalName}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {formatBytes(file.sizeBytes)} • {file.mimeType}
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Direct in-browser preview is not supported for this file format. You can download
              it to open with your local application.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 px-4 rounded-xl bg-theme-gradient hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-theme-glow"
              >
                <Download className="w-4 h-4" /> Download File
              </button>
              <button
                onClick={handleOpenInNewTab}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Open Raw
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer shortcut hints */}
      <footer className="hidden sm:flex items-center justify-between px-6 py-2 bg-slate-900/90 border-t border-white/10 text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 mr-1">
              ← / →
            </kbd>
            Prev / Next
          </span>
          {isImage && (
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 mr-1">
                + / -
              </kbd>
              Zoom
            </span>
          )}
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 mr-1">
              F
            </kbd>
            Fullscreen
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300 mr-1">
              Esc
            </kbd>
            Close
          </span>
        </div>

        <div className="text-slate-400">
          TeleCloud Internal Browser • Secure Telegram Storage
        </div>
      </footer>
    </div>
  );
}

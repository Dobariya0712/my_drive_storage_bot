// src/components/providers/FileViewerProvider.tsx
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { FileRow } from "@/lib/db/schema";
import { FileViewerModal } from "@/components/dashboard/FileViewerModal";

interface FileViewerContextValue {
  openFile: (file: FileRow, fileList?: FileRow[]) => void;
  closeFile: () => void;
  currentFile: FileRow | null;
  isOpen: boolean;
}

const FileViewerContext = createContext<FileViewerContextValue>({
  openFile: () => {},
  closeFile: () => {},
  currentFile: null,
  isOpen: false,
});

export function FileViewerProvider({ children }: { children: ReactNode }) {
  const [currentFile, setCurrentFile] = useState<FileRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const openFile = useCallback((file: FileRow, fileList: FileRow[] = []) => {
    setCurrentFile(file);
    setFiles(fileList.length > 0 ? fileList : [file]);
    setIsOpen(true);
  }, []);

  const closeFile = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNavigate = useCallback((file: FileRow) => {
    setCurrentFile(file);
  }, []);

  return (
    <FileViewerContext.Provider value={{ openFile, closeFile, currentFile, isOpen }}>
      {children}
      <FileViewerModal
        file={currentFile}
        files={files}
        isOpen={isOpen}
        onClose={closeFile}
        onNavigate={handleNavigate}
      />
    </FileViewerContext.Provider>
  );
}

export const useFileViewer = () => useContext(FileViewerContext);

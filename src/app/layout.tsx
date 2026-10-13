// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: {
    default: "TeleCloud — Telegram-Powered Cloud Storage",
    template: "%s | TeleCloud",
  },
  description:
    "Secure cloud storage powered by Telegram. Upload, organize, and share your files with military-grade encryption.",
  keywords: ["cloud storage", "telegram", "file sharing", "secure storage"],
  robots: { index: false, follow: false }, // private app
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

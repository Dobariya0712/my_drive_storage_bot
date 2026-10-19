// src/components/layout/Sidebar.tsx
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme, COLOR_THEMES, ColorTheme } from "@/components/providers/ThemeProvider";
import { formatBytes, isUserAdmin } from "@/lib/utils";
import {
  Cloud,
  LayoutDashboard,
  FolderOpen,
  Image,
  Video,
  FileText,
  Share2,
  Trash2,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  Palette,
  Check,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "My Files", icon: FolderOpen },
  { href: "/files?type=image", label: "Images", icon: Image },
  { href: "/files?type=video", label: "Videos", icon: Video },
  { href: "/files?type=document", label: "Documents", icon: FileText },
  { href: "/files?shared=true", label: "Shared Files", icon: Share2 },
  { href: "/trash", label: "Trash", icon: Trash2 },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

function SidebarContent({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme, colorTheme, setColorTheme } = useTheme();
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const usedPercent = user
    ? Math.min(100, (user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  // Exact matching so only the specific active tab is highlighted
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    const [basePath, queryString] = href.split("?");

    if (pathname !== basePath) {
      return false;
    }

    if (queryString) {
      const itemParams = new URLSearchParams(queryString);
      for (const [key, val] of itemParams.entries()) {
        if (searchParams.get(key) !== val) {
          return false;
        }
      }
      return true;
    }

    if (basePath === "/files") {
      const hasType = searchParams.has("type");
      const hasShared = searchParams.has("shared");
      return !hasType && !hasShared;
    }

    return true;
  };

  return (
    <aside
      className={clsx(
        "flex flex-col h-full bg-card/95 border-r border-border backdrop-blur-md",
        mobile ? "w-full" : "w-64"
      )}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/80">
        <div className="w-10 h-10 rounded-2xl bg-theme-gradient flex items-center justify-center shadow-theme-glow transition-all">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-foreground">
            TeleCloud
          </span>
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Cloud Storage
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3.5 py-4 overflow-y-auto space-y-6">
        <div className="space-y-1">
          <p className="px-3 pb-1.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Overview
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  active
                    ? "bg-theme-gradient text-white shadow-lg shadow-theme-glow font-semibold"
                    : "text-muted-foreground hover:bg-accent/80 hover:text-foreground hover:translate-x-0.5"
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-white" : "text-muted-foreground group-hover:text-theme-accent"
                  )}
                />
                <span className="flex-1 truncate">{label}</span>
                {active && (
                  <ChevronRight className="w-4 h-4 text-white/80 animate-in fade-in" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin Section (Strictly for dobariya2008@gmail.com) */}
        {isUserAdmin(user) && (
          <div className="pt-2 border-t border-border/60">
            <p className="px-3 pb-2 text-[11px] font-semibold text-purple-400/80 uppercase tracking-wider">
              Management
            </p>
            <Link
              href="/admin"
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                pathname === "/admin"
                  ? "bg-theme-gradient text-white shadow-lg shadow-theme-glow"
                  : "text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 hover:translate-x-0.5"
              )}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-purple-400 group-hover:text-purple-200 transition-transform group-hover:scale-110" />
              <span className="flex-1">Admin Panel</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-md border border-purple-400/30">
                Admin
              </span>
            </Link>
          </div>
        )}

        {/* Preferences & Theme Controls */}
        <div className="pt-2 border-t border-border/60 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Preferences
          </p>

          <Link
            href="/settings"
            onClick={onClose}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
              pathname === "/settings"
                ? "bg-theme-gradient text-white shadow-lg shadow-theme-glow font-semibold"
                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground hover:translate-x-0.5"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-theme-accent transition-transform group-hover:scale-110" />
            <span>Settings</span>
          </Link>

          {/* Quick Theme & Color Picker in Sidebar */}
          <div className="pt-2 px-1">
            <div className="p-2.5 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-theme-accent" /> Theme
                </span>
                <button
                  type="button"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </button>
              </div>

              {/* Color dots row */}
              <div className="flex items-center justify-between pt-1">
                {COLOR_THEMES.map((c) => {
                  const active = colorTheme === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorTheme(c.id as ColorTheme)}
                      className={`relative w-6 h-6 rounded-lg transition-transform hover:scale-110 flex items-center justify-center ${
                        active ? "ring-2 ring-foreground/60 scale-105" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.accent }}
                      title={`${c.name} Theme`}
                    >
                      {active && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Storage Usage Card & User Profile */}
      {user && (
        <div className="p-4 border-t border-border/80 bg-background/40 space-y-3">
          <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Storage Used
              </span>
              <span className="font-bold text-foreground">{Math.round(usedPercent)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden p-0.5">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-700",
                  usedPercent > 90
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : usedPercent > 70
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-theme-gradient"
                )}
                style={{ width: `${Math.max(usedPercent, 2)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatBytes(user.storageUsedBytes)}</span>
              <span>{formatBytes(user.storageQuotaBytes)}</span>
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 px-1.5 py-1">
            <div className="w-9 h-9 rounded-xl bg-theme-gradient text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-md shadow-theme-glow">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
              <p className="text-[11px] text-muted-foreground capitalize font-medium">
                {isUserAdmin(user) ? "Super Admin" : user.role}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside className={clsx("flex flex-col h-full bg-card border-r border-border", props.mobile ? "w-full" : "w-64")}>
          <div className="p-6">
            <div className="w-8 h-8 rounded-xl bg-theme-soft animate-pulse" />
          </div>
        </aside>
      }
    >
      <SidebarContent {...props} />
    </Suspense>
  );
}

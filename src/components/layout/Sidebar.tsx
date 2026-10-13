// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatBytes } from "@/lib/utils";
import {
  Cloud, LayoutDashboard, FolderOpen, Image, Video, FileText,
  Share2, Trash2, Settings, LogOut, ChevronRight, ShieldCheck,
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

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const usedPercent = user
    ? Math.min(100, (user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href.split("?")[0])) return true;
    return false;
  };

  return (
    <aside className={clsx(
      "flex flex-col h-full",
      mobile ? "w-full" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight">TeleCloud</span>
          <p className="text-xs text-muted-foreground">Cloud Storage</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                isActive(href)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive(href) ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1">{label}</span>
              {isActive(href) && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          ))}
        </div>

        {user?.role === "admin" && (
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href="/admin"
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group",
                pathname === "/admin"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                  : "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20"
              )}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-purple-400 group-hover:text-purple-300" />
              <span className="flex-1">Admin Panel</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-md">
                Admin
              </span>
            </Link>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/settings"
            onClick={onClose}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
              pathname === "/settings"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Storage Usage */}
      {user && (
        <div className="px-4 py-4 border-t border-border">
          <div className="bg-accent rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Storage</span>
              <span className="text-xs font-medium">{Math.round(usedPercent)}%</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  usedPercent > 90 ? "bg-red-500" : usedPercent > 70 ? "bg-yellow-500" : "bg-blue-600"
                )}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{formatBytes(user.storageUsedBytes)} used</span>
              <span className="text-xs text-muted-foreground">{formatBytes(user.storageQuotaBytes)}</span>
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 mt-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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

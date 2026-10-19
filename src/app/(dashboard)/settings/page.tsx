// src/app/(dashboard)/settings/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { useTheme, COLOR_THEMES, ColorTheme, Theme } from "@/components/providers/ThemeProvider";
import {
  Key,
  HardDrive,
  User,
  Loader2,
  Lock,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast("Password updated successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast(data.error || "Failed to update password", "error");
      }
    } catch {
      toast("Error updating password", "error");
    } finally {
      setSaving(false);
    }
  };

  const usedPercent = user
    ? Math.min(100, (user.storageUsedBytes / user.storageQuotaBytes) * 100)
    : 0;

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your theme color, appearance, security credentials, and storage quota.
        </p>
      </div>

      {/* 1. APPEARANCE & THEME COLOR CUSTOMIZER */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-soft flex items-center justify-center text-theme-accent">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Appearance & Theme Color</h2>
              <p className="text-xs text-muted-foreground">
                Personalize your workspace palette and display mode
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-theme-soft text-theme-accent">
            <Sparkles className="w-3.5 h-3.5" />
            Active
          </span>
        </div>

        {/* Display Mode Selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
            Display Mode
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { id: "light" as Theme, label: "Light", icon: Sun },
              { id: "dark" as Theme, label: "Dark", icon: Moon },
              { id: "system" as Theme, label: "System", icon: Laptop },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === id
                    ? "border-theme-accent bg-theme-soft text-theme-accent font-semibold shadow-xs"
                    : "border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Accent Color Selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
            Primary Theme Color
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COLOR_THEMES.map((c) => {
              const active = colorTheme === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setColorTheme(c.id as ColorTheme);
                    toast(`Theme color changed to ${c.name}`, "success");
                  }}
                  className={`group relative flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                    active
                      ? "border-theme-accent ring-2 ring-theme-accent/40 bg-theme-soft shadow-xs"
                      : "border-border hover:border-border/90 bg-card/80 hover:bg-muted/50"
                  }`}
                >
                  {/* Swatch circle */}
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${c.previewClass} flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105`}
                  >
                    {active && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: c.accent }}
                      />
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">
                        {c.id}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Theme Preview Card */}
        <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Live Accent Preview</span>
            <span className="font-mono text-[11px] text-theme-accent">CSS: var(--theme-gradient)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="px-4 py-2 rounded-xl bg-theme-gradient text-white text-xs font-semibold shadow-theme-glow">
              Theme Button
            </button>
            <span className="px-3 py-1.5 rounded-xl border border-theme-accent text-theme-accent text-xs font-medium">
              Outlined Badge
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-theme-soft text-theme-accent text-xs font-semibold">
              Soft Pill
            </span>
            <div className="flex-1 min-w-[120px] h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-theme-gradient rounded-full w-3/4" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-theme-soft flex items-center justify-center text-theme-accent">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Account Details</h2>
              <p className="text-xs text-muted-foreground">Your user profile</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Email Address</label>
              <p className="font-medium mt-0.5">{user?.email || "—"}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Account Role</label>
              <p className="font-medium mt-0.5 capitalize">{user?.role || "user"}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">User ID</label>
              <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{user?.id || "—"}</p>
            </div>
          </div>
        </div>

        {/* Storage Quota */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-theme-soft flex items-center justify-center text-theme-accent">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Storage Plan</h2>
              <p className="text-xs text-muted-foreground">Telegram backend quota</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-semibold">
                {user ? formatBytes(user.storageUsedBytes) : "0 B"} of{" "}
                {user ? formatBytes(user.storageQuotaBytes) : "1 GB"}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-gradient rounded-full transition-all duration-500"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(100 - usedPercent)}% free space remaining
            </p>
          </div>
        </div>
      </div>

      {/* Security & Password */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Change Password</h2>
            <p className="text-xs text-muted-foreground">Update your account login password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              New Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-theme-gradient hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-theme-glow active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

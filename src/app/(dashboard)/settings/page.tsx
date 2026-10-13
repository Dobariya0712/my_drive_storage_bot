// src/app/(dashboard)/settings/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Key,
  HardDrive,
  User,
  Loader2,
  Lock,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
          Manage your account profile, security credentials, and storage quota.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
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
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
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
                className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

// src/app/(dashboard)/admin/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatBytes } from "@/lib/utils";
import {
  Shield,
  Users,
  HardDrive,
  Database,
  Search,
  RefreshCw,
  Sliders,
  Trash2,
  Check,
  X,
  AlertTriangle,
  UserCheck,
  UserX,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: "user" | "admin";
  storageQuotaBytes: number;
  storageUsedBytes: number;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalStorageUsed: number;
  totalStorageQuota: number;
  totalFiles: number;
}

const PRESET_QUOTAS = [
  { label: "1 GB", bytes: 1 * 1024 * 1024 * 1024 },
  { label: "2 GB", bytes: 2 * 1024 * 1024 * 1024 },
  { label: "5 GB", bytes: 5 * 1024 * 1024 * 1024 },
  { label: "10 GB", bytes: 10 * 1024 * 1024 * 1024 },
  { label: "25 GB", bytes: 25 * 1024 * 1024 * 1024 },
  { label: "50 GB", bytes: 50 * 1024 * 1024 * 1024 },
  { label: "100 GB", bytes: 100 * 1024 * 1024 * 1024 },
  { label: "1 TB", bytes: 1024 * 1024 * 1024 * 1024 },
];

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Storage Allocation Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [customQuotaGB, setCustomQuotaGB] = useState("");
  const [submittingQuota, setSubmittingQuota] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
      ]);

      const usersJson = await usersRes.json();
      const statsJson = await statsRes.json();

      if (usersJson.success) {
        setUsersList(usersJson.data);
      } else {
        toast(usersJson.error || "Failed to load users", "error");
      }

      if (statsJson.success) {
        setStats(statsJson.data);
      }
    } catch {
      toast("Network error fetching admin data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchData();
    }
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return usersList;
    const q = searchQuery.toLowerCase();
    return usersList.filter(
      (u) => u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  // Handle Quota Allocation
  const handleSaveQuota = async (quotaBytes: number) => {
    if (!selectedUser) return;
    setSubmittingQuota(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageQuotaBytes: quotaBytes }),
      });
      const data = await res.json();

      if (data.success) {
        toast(`Storage updated for ${selectedUser.email} to ${formatBytes(quotaBytes)}`, "success");
        setUsersList((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, storageQuotaBytes: quotaBytes } : u))
        );
        setSelectedUser(null);
        setCustomQuotaGB("");
      } else {
        toast(data.error || "Failed to update quota", "error");
      }
    } catch {
      toast("Network error while updating quota", "error");
    } finally {
      setSubmittingQuota(false);
    }
  };

  // Handle Role Change
  const handleToggleRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (data.success) {
        toast(`Role updated for ${targetUser.email} to ${newRole.toUpperCase()}`, "success");
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      } else {
        toast(data.error || "Failed to change role", "error");
      }
    } catch {
      toast("Error updating user role", "error");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast(`User ${userToDelete.email} deleted successfully`, "success");
        setUsersList((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        toast(data.error || "Failed to delete user", "error");
      }
    } catch {
      toast("Error deleting user", "error");
    } finally {
      setDeletingUser(false);
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You must have administrator privileges to view and manage users and storage allocation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Admin Control Panel</h1>
              <p className="text-sm text-muted-foreground">
                Manage user accounts, assign roles, and allocate cloud storage quotas.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-accent text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold mt-0.5">{stats?.totalUsers ?? usersList.length}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Used</p>
            <h3 className="text-2xl font-bold mt-0.5">
              {stats ? formatBytes(stats.totalStorageUsed) : "0 B"}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Allocated</p>
            <h3 className="text-2xl font-bold mt-0.5">
              {stats ? formatBytes(stats.totalStorageQuota) : "0 B"}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Files</p>
            <h3 className="text-2xl font-bold mt-0.5">{stats?.totalFiles ?? 0}</h3>
          </div>
        </div>
      </div>

      {/* Users Management Section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">User Management & Quotas</h2>
            <p className="text-xs text-muted-foreground">
              Total {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Storage Used</th>
                <th className="px-6 py-4">Storage Allocation</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const usedPct = Math.min(
                    100,
                    Math.round((u.storageUsedBytes / u.storageQuotaBytes) * 100)
                  );
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                      {/* User Email & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-500 font-bold flex items-center justify-center text-sm flex-shrink-0">
                            {u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {u.email}
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-semibold border border-blue-500/20">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => !isCurrent && handleToggleRole(u)}
                          disabled={isCurrent}
                          title={isCurrent ? "Cannot change own role" : "Click to toggle role"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20"
                          } ${isCurrent ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {u.role === "admin" ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{u.role}</span>
                        </button>
                      </td>

                      {/* Storage Used */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{formatBytes(u.storageUsedBytes)}</p>
                          <div className="w-24 h-1.5 bg-background rounded-full mt-1.5 overflow-hidden border border-border">
                            <div
                              className={`h-full rounded-full ${
                                usedPct > 90
                                  ? "bg-red-500"
                                  : usedPct > 70
                                  ? "bg-amber-500"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Quota Allocation */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-foreground bg-accent px-2.5 py-1 rounded-lg border border-border">
                          {formatBytes(u.storageQuotaBytes)}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setCustomQuotaGB(
                                (u.storageQuotaBytes / (1024 * 1024 * 1024)).toString()
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all"
                            title="Allocate Storage"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            Allocate
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage Allocation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Storage Allocation</h3>
                <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-md">
                  Assign cloud storage quota for <strong>{selectedUser.email}</strong>
                </p>
              </div>
            </div>

            {/* Current details */}
            <div className="bg-accent/50 rounded-xl p-4 mb-6 border border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Usage:</span>
                <span className="font-semibold">{formatBytes(selectedUser.storageUsedBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Allocation:</span>
                <span className="font-semibold text-blue-400">
                  {formatBytes(selectedUser.storageQuotaBytes)}
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Quick Preset Allocations
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_QUOTAS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleSaveQuota(preset.bytes)}
                    disabled={submittingQuota}
                    className="py-2 px-3 rounded-xl border border-border bg-background hover:bg-blue-600 hover:text-white hover:border-blue-600 text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Or Custom Storage Quota (in GB)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={customQuotaGB}
                    onChange={(e) => setCustomQuotaGB(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    GB
                  </span>
                </div>
                <button
                  onClick={() => {
                    const gb = parseFloat(customQuotaGB);
                    if (!gb || gb <= 0) {
                      toast("Please enter a valid GB amount", "error");
                      return;
                    }
                    if (gb > 1000000) {
                      toast("Maximum quota is 1,000,000 GB", "error");
                      return;
                    }
                    handleSaveQuota(Math.round(gb * 1024 * 1024 * 1024));
                  }}
                  disabled={submittingQuota || !customQuotaGB}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Delete User Account?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{userToDelete.email}</strong>? All files, folders,
              and data associated with this user will be permanently deleted.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
                className="px-4 py-2.5 rounded-xl border border-border hover:bg-accent text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-red-500/20"
              >
                {deletingUser ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

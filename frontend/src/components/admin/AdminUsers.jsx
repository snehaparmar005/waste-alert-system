import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { apiRequest, getSession } from "../../api/client";

const ROLES = [
  { value: "citizen", label: "Citizen" },
  { value: "gov", label: "Nagar Nigam Officer" },
  { value: "worker", label: "Field Worker" },
  { value: "admin", label: "System Admin" },
];

function getRoleLabel(role) {
  return ROLES.find((option) => option.value === role)?.label || role;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "citizen" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const currentUserId = getSession()?.user?.id;

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiRequest("/api/admin/users");
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!normalizedQuery) return true;
      return [user.name, user.email, user.role, getRoleLabel(user.role)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [query, roleFilter, users]);

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({ name: user.name || "", email: user.email || "", role: user.role || "citizen" });
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setError("");
    try {
      const updatedUser = await apiRequest(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setUsers((currentUsers) =>
        currentUsers.map((user) => user.id === updatedUser.id ? updatedUser : user),
      );
      setEditingUser(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (user) => {
    if (!window.confirm(`Delete the account for ${user.name}? This cannot be undone.`)) {
      return;
    }
    setError("");
    try {
      await apiRequest(`/api/admin/users/${user.id}`, { method: "DELETE" });
      setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
          System Administration
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">Staff &amp; User Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Search accounts and update user details or role assignments.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search users by name, email, or role</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or role"
              className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
            />
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 sm:w-56"
            >
              <option value="all">All Roles</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#159B43]" />
            <h2 className="font-bold text-[#0B4650]">Accounts</h2>
          </div>
          <span className="text-xs text-gray-500">{filteredUsers.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F4F7F6] text-xs uppercase tracking-wide text-[#0B4650]">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading accounts...
                    </span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    No accounts match these filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="text-gray-700 hover:bg-gray-50/70">
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#0B4650]">
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-gray-400" />
                        {user.name}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0B4650] px-3 text-xs font-semibold text-white hover:bg-[#093a42]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(user)}
                          disabled={String(user.id) === String(currentUserId)}
                          aria-label={`Delete ${user.name}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 px-2.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close edit user dialog"
            onClick={() => !saving && setEditingUser(null)}
            className="absolute inset-0 bg-black/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#159B43]">
                  Account management
                </p>
                <h2 id="edit-user-title" className="text-xl font-bold text-[#0B4650]">
                  Edit User
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Name
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Role
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </label>
              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={saving}
                  className="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#159B43] px-4 text-sm font-semibold text-white hover:bg-[#118037] disabled:opacity-50"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

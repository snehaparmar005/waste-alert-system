import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  Mail,
  Pencil,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "../../api/client";

const EMPTY_FORM = { name: "", email: "", password: "" };

export default function GovWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [modalMode, setModalMode] = useState("");
  const [editingWorker, setEditingWorker] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await apiRequest("/api/workers");
      setWorkers(Array.isArray(data) ? data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadingTimer = window.setTimeout(loadWorkers, 0);
    return () => window.clearTimeout(loadingTimer);
  }, [loadWorkers]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingWorker(null);
    setForm(EMPTY_FORM);
    setError("");
    setStatusMessage("");
  };

  const openEditModal = (worker) => {
    setModalMode("edit");
    setEditingWorker(worker);
    setForm({ name: worker.name || "", email: worker.email || "", password: "" });
    setError("");
    setStatusMessage("");
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode("");
    setEditingWorker(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      setError("Worker name and email are required.");
      return;
    }
    if (modalMode === "add" && form.password.length < 6) {
      setError("Worker password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setStatusMessage("");
    try {
      const updatedWorker = await apiRequest(
        modalMode === "add"
          ? "/api/workers"
          : `/api/workers/${editingWorker.id}`,
        {
          method: modalMode === "add" ? "POST" : "PUT",
          body: JSON.stringify(
            modalMode === "add"
              ? { name, email, password: form.password }
              : { name, email },
          ),
        },
      );
      if (modalMode === "add") {
        setWorkers((currentWorkers) => [...currentWorkers, updatedWorker]);
        setStatusMessage(`${updatedWorker.name} was added to your workers.`);
      } else {
        setWorkers((currentWorkers) =>
          currentWorkers.map((worker) =>
            worker.id === updatedWorker.id ? updatedWorker : worker,
          ),
        );
        setStatusMessage(`${updatedWorker.name}'s details were updated.`);
      }
      setModalMode("");
      setEditingWorker(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (worker) => {
    const confirmed = window.confirm(
      `Delete ${worker.name} from your worker list?`,
    );
    if (!confirmed) return;

    setDeletingId(worker.id);
    setError("");
    setStatusMessage("");
    try {
      await apiRequest(`/api/workers/${worker.id}`, { method: "DELETE" });
      setWorkers((currentWorkers) =>
        currentWorkers.filter((currentWorker) => currentWorker.id !== worker.id),
      );
      setStatusMessage(`${worker.name} was deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
            Nagar Nigam Portal
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">My Workers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage the field workers assigned to your Nagar Nigam.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#159B43] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#118037]"
        >
          <UserPlus className="h-4 w-4" />
          Add Worker
        </button>
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
      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-[#159B43]/30 bg-[#EAF5EE] p-3 text-sm text-[#0B4650]"
        >
          {statusMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Users className="h-5 w-5 text-[#159B43]" />
          <h2 className="font-bold text-[#0B4650]">Worker Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-[#F4F7F6] text-xs uppercase tracking-wide text-[#0B4650]">
              <tr>
                <th scope="col" className="px-5 py-3">Name</th>
                <th scope="col" className="px-5 py-3">Email</th>
                <th scope="col" className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading workers...
                    </span>
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-gray-500">
                    No workers have been added yet.
                  </td>
                </tr>
              ) : (
                workers.map((worker) => (
                  <tr key={worker.id} className="text-gray-700 hover:bg-gray-50/70">
                    <td className="px-5 py-4 font-semibold text-[#0B4650]">
                      {worker.name}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {worker.email}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(worker)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#0B4650]/20 px-3 text-xs font-semibold text-[#0B4650] transition hover:bg-[#EAF5EE]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(worker)}
                          disabled={deletingId === worker.id}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === worker.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close worker dialog"
            onClick={closeModal}
            className="absolute inset-0 bg-black/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="worker-modal-title"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#159B43]">
                  Worker management
                </p>
                <h2 id="worker-modal-title" className="text-xl font-bold text-[#0B4650]">
                  {modalMode === "add" ? "Add Worker" : "Edit Worker"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label
                  htmlFor="worker-name"
                  className="mb-1.5 block text-sm font-semibold text-gray-700"
                >
                  Name
                </label>
                <input
                  id="worker-name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              <div>
                <label
                  htmlFor="worker-email"
                  className="mb-1.5 block text-sm font-semibold text-gray-700"
                >
                  Email
                </label>
                <input
                  id="worker-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={190}
                  value={form.email}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      email: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              {modalMode === "add" && (
                <div>
                  <label
                    htmlFor="worker-password"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Temporary Password
                  </label>
                  <input
                    id="worker-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={form.password}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        password: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="min-h-10 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#159B43] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#118037] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving..." : modalMode === "add" ? "Create Worker" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

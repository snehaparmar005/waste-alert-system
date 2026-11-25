import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  LoaderCircle,
  MapPin,
  MapPinned,
  Pencil,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { openInMaps } from "../../utils/openMap";

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "cleaned", label: "Cleaned" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map(({ value, label }) => [value, label]),
);
const WASTE_TYPE_LABELS = {
  biodegradable: "Biodegradable",
  hazardous: "Hazardous",
  non_biodegradable: "Non-biodegradable",
};

function getStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

function getReferenceId(report) {
  return report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`;
}

function getCategoryLabel(report) {
  const slug = report.corrected_slug || report.category?.slug || report.waste_type;
  return WASTE_TYPE_LABELS[slug] || report.category?.label || slug || "Uncategorized";
}

function getStatusStyle(status) {
  if (status === "submitted") return "bg-slate-100 text-slate-700";
  if (status === "assigned") return "bg-amber-100 text-amber-800";
  if (status === "cleaned") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

function getCoordinates(report) {
  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  if (
    report.latitude == null ||
    report.longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  return { latitude, longitude };
}

export default function GovReports() {
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workersError, setWorkersError] = useState("");
  const [editingReport, setEditingReport] = useState(null);
  const [editStatus, setEditStatus] = useState("submitted");
  const [workerId, setWorkerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      const data = await apiRequest("/api/reports");
      setReports(Array.isArray(data) ? data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await apiRequest("/api/workers");
      setWorkers(Array.isArray(data) ? data : []);
      setWorkersError("");
    } catch (requestError) {
      setWorkersError(requestError.message);
    }
  }, []);

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => {
      loadReports();
      loadWorkers();
    }, 0);
    return () => window.clearTimeout(loadingTimer);
  }, [loadReports, loadWorkers]);

  const filtered = reports.filter((report) => {
    const categorySlug = (
      report.corrected_slug ||
      report.category?.slug ||
      report.waste_type ||
      ""
    ).toLowerCase();
    const matchCategory = catFilter === "all" || categorySlug === catFilter;
    const matchStatus =
      statusFilter === "all" || getStatus(report) === statusFilter;
    return matchCategory && matchStatus;
  });

  const openUpdateModal = (report) => {
    setEditingReport(report);
    setEditStatus(getStatus(report) || "submitted");
    setWorkerId(
      report.assigned_worker_id == null ? "" : String(report.assigned_worker_id),
    );
    setModalError("");
  };

  const closeUpdateModal = () => {
    if (saving) return;
    setEditingReport(null);
    setModalError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!editingReport) return;
    if (editStatus === "assigned" && !workerId) {
      setModalError("Select a worker before assigning this complaint.");
      return;
    }

    const payload = { status: editStatus };
    if (
      workerId &&
      workerId !== String(editingReport.assigned_worker_id ?? "")
    ) {
      payload.assigned_worker_id = Number(workerId);
      payload.status = "assigned";
    }

    setSaving(true);
    setModalError("");
    setError("");
    try {
      const updatedReport = await apiRequest(`/api/reports/${editingReport.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === updatedReport.id ? updatedReport : report,
        ),
      );
      setEditingReport(null);
    } catch (requestError) {
      setModalError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
            Nagar Nigam Portal
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">
            Manage Complaints
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Review incoming reports, update their status, and assign field workers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Filter by category"
            value={catFilter}
            onChange={(event) => setCatFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All Categories</option>
            <option value="biodegradable">Biodegradable</option>
            <option value="hazardous">Hazardous</option>
            <option value="non_biodegradable">Non-biodegradable</option>
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <ClipboardList className="h-5 w-5 text-[#159B43]" />
          <h2 className="font-bold text-[#0B4650]">Complaint Register</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#F4F7F6] text-xs uppercase tracking-wide text-[#0B4650]">
              <tr>
                <th scope="col" className="px-4 py-3">Reference ID</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Confidence</th>
                <th scope="col" className="px-4 py-3">Ward</th>
                <th scope="col" className="px-4 py-3">Assigned Worker</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading complaints...
                    </span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No complaints match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => {
                  const status = getStatus(report);
                  return (
                    <tr key={report.id} className="text-gray-700 hover:bg-gray-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-[#0B4650]">
                        {getReferenceId(report)}
                      </td>
                      <td className="px-4 py-4">{getCategoryLabel(report)}</td>
                      <td className="px-4 py-4">
                        {typeof report.confidence === "number"
                          ? `${(report.confidence * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-4">{report.ward || "Ward 12 - Morar"}</td>
                      <td className="px-4 py-4">
                        {report.assigned_worker_name || "Unassigned"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            status,
                          )}`}
                        >
                          {STATUS_LABELS[status] || status || "Unknown"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openUpdateModal(report)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0B4650] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#093a42]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          View / Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close complaint dialog"
            onClick={closeUpdateModal}
            className="absolute inset-0 bg-black/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="complaint-modal-title"
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#159B43]">
                  Complaint details
                </p>
                <h2 id="complaint-modal-title" className="text-xl font-bold text-[#0B4650]">
                  {getReferenceId(editingReport)}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeUpdateModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {modalError}
              </div>
            )}

            {editingReport.image_url && (
              <img
                src={editingReport.image_url}
                alt={getCategoryLabel(editingReport)}
                className="mb-5 h-56 w-full rounded-xl border border-gray-200 object-cover"
              />
            )}

            <div className="mb-5 grid gap-3 rounded-xl bg-[#F4F7F6] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Reference ID
                </p>
                <p className="mt-1 font-bold text-[#0B4650]">
                  {getReferenceId(editingReport)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Coordinates
                </p>
                {getCoordinates(editingReport) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const coordinates = getCoordinates(editingReport);
                      openInMaps(coordinates.latitude, coordinates.longitude);
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B4650] hover:text-[#159B43]"
                  >
                    <MapPin className="h-4 w-4" />
                    {editingReport.latitude}, {editingReport.longitude}
                    <MapPinned className="ml-1 h-4 w-4" />
                  </button>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">Coordinates unavailable</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Waste Type
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {getCategoryLabel(editingReport)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {editingReport.description || editingReport.remarks || "No description"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="complaint-status"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="complaint-status"
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="complaint-worker"
                    className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700"
                  >
                    <UserRound className="h-4 w-4 text-[#159B43]" />
                    Assign Worker
                  </label>
                  <select
                    id="complaint-worker"
                    value={workerId}
                    onChange={(event) => {
                      setWorkerId(event.target.value);
                      if (event.target.value) setEditStatus("assigned");
                    }}
                    disabled={Boolean(workersError)}
                    className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20 disabled:bg-gray-100"
                  >
                    <option value="">Select a worker</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={String(worker.id)}>
                        {worker.name} · {worker.email}
                      </option>
                    ))}
                  </select>
                  {workersError && (
                    <p className="mt-1 text-xs text-red-600">{workersError}</p>
                  )}
                  {!workersError && workers.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      No workers are available for this Nagar Nigam.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeUpdateModal}
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
                  {saving ? "Saving..." : "Save Updates"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

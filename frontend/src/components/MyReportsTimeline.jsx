import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  FileText,
  LoaderCircle,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { openInMaps } from "../utils/openMap";

const WASTE_TYPES = [
  { value: "biodegradable", label: "Biodegradable" },
  { value: "hazardous", label: "Hazardous" },
  { value: "non_biodegradable", label: "Non-biodegradable" },
];

const STATUS_LABELS = {
  submitted: "Submitted",
  assigned: "Assigned",
  in_progress: "In Progress",
  cleaned: "Cleaned",
  rejected: "Rejected",
};

const EMPTY_EDIT_FORM = {
  description: "",
  remarks: "",
  ward: "",
  corrected_slug: "biodegradable",
  latitude: "",
  longitude: "",
};

function getReportStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

function getReferenceId(report) {
  return report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`;
}

function getCoordinates(report) {
  if (
    report.latitude == null ||
    report.longitude == null ||
    report.latitude === "" ||
    report.longitude === ""
  ) {
    return null;
  }
  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  return { latitude, longitude };
}

function getWasteType(report) {
  const correctedType = WASTE_TYPES.find(
    (type) => type.value === report.corrected_slug,
  );
  return correctedType?.label || report.category?.label || "Uncategorized";
}

function getStatusStyle(status) {
  if (status === "submitted") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "assigned") return "border-amber-200 bg-amber-100 text-amber-800";
  if (status === "cleaned") return "border-green-200 bg-green-100 text-green-800";
  if (status === "in_progress") return "border-blue-200 bg-blue-100 text-blue-800";
  return "border-gray-200 bg-gray-100 text-gray-700";
}

export default function MyReportsTimeline() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [viewingReport, setViewingReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const initialRefresh = window.setTimeout(loadReports, 0);
    const refreshInterval = window.setInterval(loadReports, 15000);
    window.addEventListener("focus", loadReports);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", loadReports);
    };
  }, [loadReports]);

  const openEditDialog = (report) => {
    if (getReportStatus(report) !== "submitted") return;
    setEditingReport(report);
    setEditForm({
      description: report.description || "",
      remarks: report.remarks || "",
      ward: report.ward || "",
      corrected_slug: report.corrected_slug || report.category?.slug || "biodegradable",
      latitude: report.latitude == null ? "" : String(report.latitude),
      longitude: report.longitude == null ? "" : String(report.longitude),
    });
    setEditError("");
    setStatusMessage("");
  };

  const closeEditDialog = () => {
    if (saving) return;
    setEditingReport(null);
    setEditError("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingReport || getReportStatus(editingReport) !== "submitted") {
      setEditError("Only submitted reports can be edited.");
      return;
    }

    const latitude = Number(editForm.latitude);
    const longitude = Number(editForm.longitude);
    if (
      editForm.latitude.trim() === "" ||
      editForm.longitude.trim() === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      setEditError("Enter valid coordinates for the report location.");
      return;
    }

    setSaving(true);
    setEditError("");
    setError("");
    setStatusMessage("");
    try {
      const updatedReport = await apiRequest(`/api/reports/${editingReport.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: editForm.description,
          remarks: editForm.remarks,
          ward: editForm.ward,
          corrected_slug: editForm.corrected_slug,
          latitude,
          longitude,
        }),
      });
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === updatedReport.id ? updatedReport : report,
        ),
      );
      setEditingReport(null);
      setStatusMessage(`${getReferenceId(updatedReport)} was updated.`);
    } catch (requestError) {
      setEditError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
            Citizen Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">My Waste Reports</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track cleanup progress and update reports that have not yet been assigned.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadReports}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            to="/report"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#159B43] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#118037]"
          >
            <Plus className="h-4 w-4" />
            New Report
          </Link>
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
      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-[#159B43]/30 bg-[#EAF5EE] p-3 text-sm text-[#0B4650]"
        >
          {statusMessage}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading your reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-[#159B43]" />
          <h2 className="mt-3 font-semibold text-[#0B4650]">No reports submitted yet</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create a report to track cleanup progress here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[#F4F7F6]">
                <tr className="text-xs font-bold uppercase tracking-wide text-[#0B4650]">
                  <th scope="col" className="px-4 py-4">Reference ID</th>
                  <th scope="col" className="px-4 py-4">Coordinates</th>
                  <th scope="col" className="px-4 py-4">Description</th>
                  <th scope="col" className="px-4 py-4">Waste Type</th>
                  <th scope="col" className="px-4 py-4">Status</th>
                  <th scope="col" className="px-4 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => {
                  const status = getReportStatus(report);
                  const coordinates = getCoordinates(report);
                  return (
                    <tr key={report.id} className="align-top text-sm text-gray-700">
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-[#0B4650]">
                        {getReferenceId(report)}
                      </td>
                      <td className="px-4 py-4">
                        {coordinates ? (
                          <div className="space-y-2">
                            <span className="block whitespace-nowrap font-mono text-xs">
                              {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                openInMaps(coordinates.latitude, coordinates.longitude)
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B4650] underline decoration-[#159B43] underline-offset-2 hover:text-[#159B43]"
                            >
                              <MapPinned className="h-3.5 w-3.5" />
                              Open in Maps
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Coordinates unavailable</span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <p className="line-clamp-3">{report.description || "No description"}</p>
                        {report.remarks && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            Remarks: {report.remarks}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">{getWasteType(report)}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            status,
                          )}`}
                        >
                          {STATUS_LABELS[status] || status || "Unknown"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingReport(report)}
                            aria-label={`View ${getReferenceId(report)}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          {status === "submitted" && (
                            <button
                              type="button"
                              onClick={() => openEditDialog(report)}
                              aria-label={`Edit ${getReferenceId(report)}`}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0B4650] px-2.5 text-xs font-semibold text-white transition hover:bg-[#093a42]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close report details"
            onClick={() => setViewingReport(null)}
            className="absolute inset-0 bg-black/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-details-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#159B43]">
                  Report details
                </p>
                <h2 id="report-details-title" className="text-xl font-bold text-[#0B4650]">
                  {getReferenceId(viewingReport)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {viewingReport.image_url && (
              <img
                src={viewingReport.image_url}
                alt={getWasteType(viewingReport)}
                className="h-48 w-full rounded-xl border border-gray-200 object-cover"
              />
            )}
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-500">Description</dt>
                <dd className="mt-0.5 text-gray-800">
                  {viewingReport.description || "No description"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-500">Remarks</dt>
                <dd className="mt-0.5 text-gray-800">{viewingReport.remarks || "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-500">Waste type</dt>
                <dd className="mt-0.5 text-gray-800">{getWasteType(viewingReport)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-500">Ward</dt>
                <dd className="mt-0.5 text-gray-800">{viewingReport.ward || "Not specified"}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close edit report dialog"
            onClick={closeEditDialog}
            className="absolute inset-0 bg-black/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-report-title"
            className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#159B43]">
                  Submitted report
                </p>
                <h2 id="edit-report-title" className="text-xl font-bold text-[#0B4650]">
                  Edit {getReferenceId(editingReport)}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                disabled={saving}
                aria-label="Close edit dialog"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, description: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-remarks"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Remarks
                </label>
                <input
                  id="edit-remarks"
                  type="text"
                  value={editForm.remarks}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, remarks: event.target.value }))
                  }
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-ward"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Ward
                  </label>
                  <input
                    id="edit-ward"
                    type="text"
                    value={editForm.ward}
                    onChange={(event) =>
                      setEditForm((form) => ({ ...form, ward: event.target.value }))
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-waste-type"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Waste Category
                  </label>
                  <select
                    id="edit-waste-type"
                    value={editForm.corrected_slug}
                    onChange={(event) =>
                      setEditForm((form) => ({
                        ...form,
                        corrected_slug: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                  >
                    {WASTE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-latitude"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Latitude
                  </label>
                  <input
                    id="edit-latitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    required
                    value={editForm.latitude}
                    onChange={(event) =>
                      setEditForm((form) => ({ ...form, latitude: event.target.value }))
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-longitude"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Longitude
                  </label>
                  <input
                    id="edit-longitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    required
                    value={editForm.longitude}
                    onChange={(event) =>
                      setEditForm((form) => ({ ...form, longitude: event.target.value }))
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#159B43] focus:ring-2 focus:ring-[#159B43]/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeEditDialog}
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
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

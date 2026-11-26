import { useEffect, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  MapPin,
  MapPinned,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { apiRequest, getImageUrl } from "../api/client";
import { openInMaps } from "../utils/openMap";

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "cleaned", label: "Cleaned" },
  { value: "rejected", label: "Rejected" },
];

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

export default function ReportUpdateModal({
  report,
  workers,
  workersError,
  onClose,
  onUpdated,
}) {
  const [editStatus, setEditStatus] = useState(getStatus(report) || "submitted");
  const [workerId, setWorkerId] = useState(
    report.assigned_worker_id == null ? "" : String(report.assigned_worker_id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/api/reports/${report.id}`)
      .then((reportDetails) => {
        if (active) setDetails(reportDetails);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [report.id]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (editStatus === "assigned" && !workerId) {
      setError("Select a worker before assigning this complaint.");
      return;
    }

    const payload = { status: editStatus };
    if (workerId && workerId !== String(report.assigned_worker_id ?? "")) {
      payload.assigned_worker_id = Number(workerId);
      payload.status = "assigned";
    }

    setSaving(true);
    setError("");
    try {
      const updatedReport = await apiRequest(`/api/reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      onUpdated(updatedReport);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const currentReport = details || report;
  const coordinates = getCoordinates(currentReport);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close complaint dialog"
        onClick={() => !saving && onClose()}
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
              {getReferenceId(currentReport)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {details?.image_url ? (
          <img
            src={getImageUrl(details.image_url)}
            alt={getCategoryLabel(currentReport)}
            loading="lazy"
            width="560"
            height="224"
            className="mb-5 h-56 w-full rounded-xl border border-gray-200 object-cover"
          />
        ) : !details ? (
          <div className="mb-5 h-56 animate-pulse rounded-xl bg-gray-100" role="status">
            Loading report details...
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 rounded-xl bg-[#F4F7F6] p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Reference ID
            </p>
            <p className="mt-1 font-bold text-[#0B4650]">{getReferenceId(currentReport)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Coordinates
            </p>
            {coordinates ? (
              <button
                type="button"
                onClick={() => openInMaps(coordinates.latitude, coordinates.longitude)}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B4650] hover:text-[#159B43]"
              >
                <MapPin className="h-4 w-4" />
                {currentReport.latitude}, {currentReport.longitude}
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
              {getCategoryLabel(currentReport)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {currentReport.description || currentReport.remarks || "No description"}
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
                <p className="mt-1 text-xs text-gray-500">No workers are available.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
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
  );
}

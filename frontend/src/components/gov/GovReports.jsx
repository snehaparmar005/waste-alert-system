import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  LoaderCircle,
  Pencil,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import ReportUpdateModal from "../ReportUpdateModal";

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

export default function GovReports() {
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workersError, setWorkersError] = useState("");
  const [editingReport, setEditingReport] = useState(null);

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
                          onClick={() => setEditingReport(report)}
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
        <ReportUpdateModal
          key={editingReport.id}
          report={editingReport}
          workers={workers}
          workersError={workersError}
          onClose={() => setEditingReport(null)}
          onUpdated={(updatedReport) => {
            setReports((currentReports) =>
              currentReports.map((report) =>
                report.id === updatedReport.id ? updatedReport : report,
              ),
            );
            setEditingReport(null);
          }}
        />
      )}
    </div>
  );
}

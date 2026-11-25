import { useEffect, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import ReportUpdateModal from "../ReportUpdateModal";

function getStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

function getStatusStyle(status) {
  if (status === "submitted") return "bg-slate-100 text-slate-700";
  if (status === "assigned") return "bg-amber-100 text-amber-800";
  if (status === "cleaned") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

function getReferenceId(report) {
  return report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`;
}

function getCategoryLabel(report) {
  return report.category?.label || report.waste_type || "Uncategorized";
}

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workersError, setWorkersError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      apiRequest("/api/reports")
        .then((data) => {
          if (active) setReports(Array.isArray(data) ? data : []);
        })
        .catch((requestError) => {
          if (active) setError(requestError.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      apiRequest("/api/workers")
        .then((data) => {
          if (active) setWorkers(Array.isArray(data) ? data : []);
        })
        .catch((requestError) => {
          if (active) setWorkersError(requestError.message);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const handleDelete = async (report) => {
    if (!window.confirm(`Delete ${getReferenceId(report)}? This cannot be undone.`)) {
      return;
    }
    setError("");
    try {
      await apiRequest(`/api/reports/${report.id}`, { method: "DELETE" });
      setReports((currentReports) =>
        currentReports.filter((currentReport) => currentReport.id !== report.id),
      );
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
        <h1 className="mt-1 text-3xl font-bold text-[#0B4650]">All System Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review complaint details, update statuses, and assign field workers.
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

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <ClipboardList className="h-5 w-5 text-[#159B43]" />
          <h2 className="font-bold text-[#0B4650]">Complaint Register</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-[#F4F7F6] text-xs uppercase tracking-wide text-[#0B4650]">
              <tr>
                <th scope="col" className="px-4 py-3">Reference ID</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Confidence</th>
                <th scope="col" className="px-4 py-3">Assigned Worker</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading reports...
                    </span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
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
                      <td className="px-4 py-4">
                        {report.assigned_worker_name || "Unassigned"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                        >
                          {status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0B4650] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#093a42]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            View / Update
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
                            aria-label={`Delete ${getReferenceId(report)}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 px-2.5 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedReport && (
        <ReportUpdateModal
          key={selectedReport.id}
          report={selectedReport}
          workers={workers}
          workersError={workersError}
          onClose={() => setSelectedReport(null)}
          onUpdated={(updatedReport) => {
            setReports((currentReports) =>
              currentReports.map((report) =>
                report.id === updatedReport.id ? updatedReport : report,
              ),
            );
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
}

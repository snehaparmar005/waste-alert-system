import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ClipboardList,
  MapPin,
  Users,
} from "lucide-react";
import { apiRequest, getPageResult, getSession } from "../../api/client";
import LazyRender from "../LazyRender";
import PaginationControls from "../PaginationControls";

const CHART_CIRCUMFERENCE = 2 * Math.PI * 40;
const GovReportsMap = lazy(() => import("./GovReportsMap"));

const STATUS_CATEGORIES = [
  { key: "submitted", label: "Submitted", color: "#94a3b8" },
  { key: "assigned", label: "Assigned", color: "#f59e0b" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "cleaned", label: "Cleaned", color: "#10b981" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
];

const WASTE_CATEGORIES = [
  { key: "biodegradable", label: "Biodegradable", color: "#159B43" },
  { key: "hazardous", label: "Hazardous", color: "#f59e0b" },
  { key: "non_biodegradable", label: "Non-biodegradable", color: "#0B4650" },
  { key: "other", label: "Other", color: "#8b5cf6" },
];
export default function GovDashboard() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("status");
  const user = getSession()?.user;

  const loadReports = useCallback(async (requestedPage = 1) => {
    try {
      const data = getPageResult(
        await apiRequest(`/api/reports?page=${requestedPage}&limit=20`),
      );
      setReports(data.items);
      setSummary(data.summary);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotalReports(data.total);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => loadReports(page), 0);
    const refreshInterval = window.setInterval(() => loadReports(page), 15000);
    const refreshOnFocus = () => loadReports(page);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadReports, page]);

  const total = summary?.total || totalReports;
  const submitted = summary?.submitted || 0;
  const assigned = summary?.assigned || 0;
  const cleaned = summary?.cleaned || 0;
  const geolocatedCount = reports.filter(
    (report) =>
      report.latitude != null &&
      report.longitude != null &&
      Number.isFinite(Number(report.latitude)) &&
      Number.isFinite(Number(report.longitude)) &&
      !(Number(report.latitude) === 0 && Number(report.longitude) === 0),
  ).length;
  const chartCategories = chartType === "status" ? STATUS_CATEGORIES : WASTE_CATEGORIES;
  const chartSegments = useMemo(() => {
    const counts =
      chartType === "status"
        ? summary || {}
        : summary?.categories || {};
    return chartCategories.map((category, index) => {
      const count = counts[category.key] || 0;
      const length = total ? (count / total) * CHART_CIRCUMFERENCE : 0;
      const offset = chartCategories
        .slice(0, index)
        .reduce(
          (sum, previousCategory) =>
            sum +
            (total
              ? ((counts[previousCategory.key] || 0) / total) *
                CHART_CIRCUMFERENCE
              : 0),
          0,
        );
      return { ...category, count, length, offset };
    });
  }, [chartCategories, chartType, summary, total]);

  const stats = [
    { label: "Total Complaints", value: total, Icon: ClipboardList, color: "text-[#0B4650]", bg: "bg-[#EAF5EE]" },
    { label: "Submitted", value: submitted, Icon: AlertCircle, color: "text-slate-700", bg: "bg-slate-100" },
    { label: "Assigned", value: assigned, Icon: Users, color: "text-amber-800", bg: "bg-amber-100" },
    { label: "Cleaned", value: cleaned, Icon: MapPin, color: "text-emerald-700", bg: "bg-emerald-100" },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-[#D9F2E3] via-[#E6F6EC] to-[#C8EBD6] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#159B43]">
            Nagar Nigam Portal
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#0B4650] sm:text-3xl">
            Welcome, {user?.name || "Nagar Nigam Officer"}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#1E5648]">
            Municipal Area Waste Monitoring &amp; Cleanup Dispatch
          </p>
        </div>
        <Link
          to="/gov/reports"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#159B43] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#118037]"
        >
          Manage Complaints
        </Link>
      </header>

      <section aria-label="Complaint totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-800">
                {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100" /> : value}
              </p>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#0B4650]">Live Complaint Map</h2>
              <p className="mt-1 text-xs text-gray-500">
                {geolocatedCount} geolocated complaints on this page
              </p>
            </div>
            <Link
              to="/gov/reports"
              className="text-xs font-semibold text-[#159B43] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="h-80 w-full overflow-hidden rounded-xl border border-gray-200">
            <LazyRender fallback={<div className="h-full animate-pulse bg-gray-100" />}>
              <Suspense fallback={<div className="h-full animate-pulse bg-gray-100" />}>
                <GovReportsMap reports={reports} />
              </Suspense>
            </LazyRender>
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={totalReports}
            onPageChange={setPage}
          />
        </section>

        <LazyRender fallback={<div className="h-80 animate-pulse rounded-2xl bg-gray-100" />}>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#0B4650]">Complaint Breakdown</h2>
              <p className="mt-1 text-xs text-gray-500">Distribution by status or waste category</p>
            </div>
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                aria-pressed={chartType === "status"}
                onClick={() => setChartType("status")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  chartType === "status"
                    ? "bg-white text-[#0B4650] shadow-sm"
                    : "text-gray-600"
                }`}
              >
                Status
              </button>
              <button
                type="button"
                aria-pressed={chartType === "waste"}
                onClick={() => setChartType("waste")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  chartType === "waste"
                    ? "bg-white text-[#0B4650] shadow-sm"
                    : "text-gray-600"
                }`}
              >
                Waste type
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <div className="relative h-52 w-52 shrink-0">
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label={`${total} complaints broken down by ${chartType}`}
                className="h-full w-full -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="14"
                />
                {chartSegments.map((segment) =>
                  segment.count ? (
                    <circle
                      key={segment.key}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="14"
                      strokeDasharray={`${segment.length} ${CHART_CIRCUMFERENCE - segment.length}`}
                      strokeDashoffset={-segment.offset}
                    >
                      <title>{`${segment.label}: ${segment.count}`}</title>
                    </circle>
                  ) : null,
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#0B4650]">{total}</span>
                <span className="text-xs text-gray-500">complaints</span>
              </div>
            </div>

            <ul className="grid w-full grid-cols-1 gap-3 sm:max-w-xs">
              {chartSegments.map((segment) => (
                <li key={segment.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    {segment.label}
                  </span>
                  <span className="font-bold text-[#0B4650]">{segment.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        </LazyRender>
      </div>

    </div>
  );
}

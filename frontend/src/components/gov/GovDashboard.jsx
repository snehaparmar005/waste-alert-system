import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ClipboardList,
  MapPin,
  Users,
} from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { apiRequest, getSession, normalizeReportsResponse } from "../../api/client";
import { openInMaps } from "../../utils/openMap";

const MAP_CENTER = [26.2183, 78.1828];
const CHART_CIRCUMFERENCE = 2 * Math.PI * 40;

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
const WASTE_TYPE_LABELS = {
  biodegradable: "Biodegradable",
  hazardous: "Hazardous",
  non_biodegradable: "Non-biodegradable",
};

function getReportStatus(report) {
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
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  return [latitude, longitude];
}

function getStatusStyle(status) {
  if (status === "submitted") return "bg-slate-100 text-slate-700";
  if (status === "assigned") return "bg-amber-100 text-amber-800";
  if (status === "cleaned") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

function FitMapToReports({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else if (positions.length > 1) {
      map.fitBounds(positions, { padding: [24, 24], maxZoom: 14 });
    }
  }, [map, positions]);

  return null;
}

export default function GovDashboard() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("status");
  const user = getSession()?.user;

  const loadReports = useCallback(async () => {
    try {
      const res = await apiRequest("/api/reports");
      const { items } = normalizeReportsResponse(res);
      setReports(items);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
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

  const total = reports.length;
  const submitted = reports.filter((report) => getReportStatus(report) === "submitted").length;
  const assigned = reports.filter((report) => getReportStatus(report) === "assigned").length;
  const cleaned = reports.filter((report) => getReportStatus(report) === "cleaned").length;
  const positions = useMemo(
    () => reports.map(getCoordinates).filter((coordinates) => coordinates !== null),
    [reports],
  );
  const chartCategories = chartType === "status" ? STATUS_CATEGORIES : WASTE_CATEGORIES;
  const chartSegments = useMemo(() => {
    const counts = reports.reduce((result, report) => {
      const key =
        chartType === "status"
          ? getReportStatus(report)
          : report.corrected_slug || report.category?.slug || "other";
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
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
  }, [chartCategories, chartType, reports, total]);

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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#0B4650]">Live Complaint Map</h2>
              <p className="mt-1 text-xs text-gray-500">
                {positions.length} geolocated complaints
              </p>
            </div>
            <Link
              to="/gov/reports"
              className="text-xs font-semibold text-[#159B43] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="h-80 overflow-hidden rounded-xl border border-gray-200">
            <MapContainer
              center={MAP_CENTER}
              zoom={12}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitMapToReports positions={positions} />
              {reports.map((report) => {
                const coordinates = getCoordinates(report);
                if (!coordinates) return null;
                const status = getReportStatus(report);
                return (
                  <Marker key={report.id} position={coordinates}>
                    <Popup>
                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-[#0B4650]">
                          {getReferenceId(report)} · {getCategoryLabel(report)}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 font-semibold ${getStatusStyle(
                            status,
                          )}`}
                        >
                          {status.replaceAll("_", " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openInMaps(coordinates[0], coordinates[1])
                          }
                          className="flex items-center gap-1 font-semibold text-[#159B43]"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Open in Maps
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </section>

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
      </div>

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
              <p className="text-2xl font-extrabold text-gray-800">{value}</p>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

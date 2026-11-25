import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  MapPinned,
  Navigation,
  RefreshCw,
  Truck,
} from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { apiRequest, getImageUrl, getSession } from "../../api/client";
import { openInMaps } from "../../utils/openMap";

const MAP_CENTER = [26.2183, 78.1828];
const CHART_CIRCUMFERENCE = 2 * Math.PI * 40;
const STATUS_CATEGORIES = [
  { key: "assigned", label: "Assigned", color: "#f59e0b" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "cleaned", label: "Cleaned", color: "#10b981" },
];

function getStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

function getReferenceId(report) {
  return report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`;
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
  if (status === "assigned") return "bg-amber-100 text-amber-800";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  if (status === "cleaned") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function FitMapToTasks({ positions }) {
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

export default function WorkerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const user = getSession()?.user;

  const loadTasks = useCallback(async () => {
    try {
      const data = await apiRequest("/api/reports");
      const reports = Array.isArray(data) ? data : [];
      setTasks(
        reports.filter(
          (report) => String(report.assigned_worker_id) === String(user?.id),
        ),
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(loadTasks, 0);
    const refreshInterval = window.setInterval(loadTasks, 15000);
    window.addEventListener("focus", loadTasks);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", loadTasks);
    };
  }, [loadTasks]);

  const positions = useMemo(
    () => tasks.map(getCoordinates).filter((coordinates) => coordinates !== null),
    [tasks],
  );
  const activeCount = tasks.filter((task) =>
    ["assigned", "in_progress"].includes(getStatus(task)),
  ).length;
  const inProgressCount = tasks.filter(
    (task) => getStatus(task) === "in_progress",
  ).length;
  const cleanedCount = tasks.filter((task) => getStatus(task) === "cleaned").length;
  const chartSegments = useMemo(() => {
    const counts = tasks.reduce((result, task) => {
      const status = getStatus(task);
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {});
    return STATUS_CATEGORIES.map((category, index) => {
      const count = counts[category.key] || 0;
      const length = tasks.length ? (count / tasks.length) * CHART_CIRCUMFERENCE : 0;
      const offset = STATUS_CATEGORIES.slice(0, index).reduce(
        (sum, previous) =>
          sum +
          (tasks.length
            ? ((counts[previous.key] || 0) / tasks.length) * CHART_CIRCUMFERENCE
            : 0),
        0,
      );
      return { ...category, count, length, offset };
    });
  }, [tasks]);

  const updateTaskStatus = async (task, status) => {
    setUpdatingId(task.id);
    setError("");
    try {
      const updatedTask = await apiRequest(`/api/reports/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? updatedTask : currentTask,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-[#D9F2E3] to-[#C8EBD6] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#159B43]">
            Field Operations
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#0B4650] sm:text-3xl">
            Welcome, {user?.name || "Field Worker"}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#1E5648]">
            Assigned cleanup tasks and live GPS navigation
          </p>
        </div>
        <button
          type="button"
          onClick={loadTasks}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0B4650] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#08353d]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Tasks
        </button>
      </header>

      <section aria-label="Task summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active Assignments", value: activeCount, Icon: ClipboardList, style: "bg-amber-100 text-amber-800" },
          { label: "In Progress", value: inProgressCount, Icon: Truck, style: "bg-blue-100 text-blue-800" },
          { label: "Cleaned", value: cleanedCount, Icon: CheckCircle2, style: "bg-emerald-100 text-emerald-700" },
        ].map(({ label, value, Icon, style }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${style}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-gray-800">{value}</p>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-[#0B4650]">Live Task Map</h2>
              <p className="text-xs text-gray-500">Locations assigned to you</p>
            </div>
            <MapPin className="h-5 w-5 text-[#159B43]" />
          </div>
          <div className="h-[320px]">
            <MapContainer center={MAP_CENTER} zoom={12} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitMapToTasks positions={positions} />
              {tasks.map((task) => {
                const coordinates = getCoordinates(task);
                if (!coordinates) return null;
                return (
                  <Marker key={task.id} position={coordinates}>
                    <Popup>
                      <div className="space-y-1">
                        <strong>{getReferenceId(task)}</strong>
                        <p>{task.remarks || task.description || "Cleanup location"}</p>
                        <button
                          type="button"
                          className="font-semibold text-[#0B4650] underline"
                          onClick={() => openInMaps(coordinates[0], coordinates[1])}
                        >
                          Open in Maps
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#0B4650]">Task Status Breakdown</h2>
              <p className="text-xs text-gray-500">Assigned work progress</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-5 py-5 sm:flex-row sm:justify-center">
            <div className="relative h-48 w-48 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#eef2f1" strokeWidth="14" />
                {chartSegments.map((segment) => (
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
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#0B4650]">{tasks.length}</span>
                <span className="text-xs text-gray-500">Tasks</span>
              </div>
            </div>
            <ul className="w-full space-y-3 sm:max-w-xs">
              {chartSegments.map((segment) => (
                <li key={segment.key} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: segment.color }} />
                    {segment.label}
                  </span>
                  <span className="font-bold text-[#0B4650]">{segment.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-[#0B4650]">Assigned Tasks</h2>
          <p className="text-xs text-gray-500">Open a location or update its cleanup status.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-[#F4F7F6] text-xs uppercase tracking-wide text-[#0B4650]">
              <tr>
                <th scope="col" className="px-4 py-3">Report</th>
                <th scope="col" className="px-4 py-3">Description</th>
                <th scope="col" className="px-4 py-3">Coordinates</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading assigned tasks...
                    </span>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No tasks have been assigned to you yet.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const status = getStatus(task);
                  const coordinates = getCoordinates(task);
                  return (
                    <tr key={task.id} className="text-gray-700 hover:bg-gray-50/70">
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-3">
                          {task.image_url && (
                            <img
                              src={getImageUrl(task.image_url)}
                              alt=""
                              className="h-11 w-11 rounded-lg object-cover"
                            />
                          )}
                          <span className="font-bold text-[#0B4650]">{getReferenceId(task)}</span>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        {task.remarks || task.description || task.waste_type || "Cleanup task"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs">
                        {coordinates ? `${coordinates[0]}, ${coordinates[1]}` : "Unavailable"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}>
                          {status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!coordinates}
                            onClick={() => coordinates && openInMaps(coordinates[0], coordinates[1])}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-[#0B4650] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Open with Map
                          </button>
                          {status === "assigned" && (
                            <button
                              type="button"
                              disabled={updatingId === task.id}
                              onClick={() => updateTaskStatus(task, "in_progress")}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#0B4650] px-3 text-xs font-semibold text-white hover:bg-[#093a42] disabled:opacity-50"
                            >
                              {updatingId === task.id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MapPinned className="h-3.5 w-3.5" />
                              )}
                              In Progress
                            </button>
                          )}
                          {status === "in_progress" && (
                            <button
                              type="button"
                              disabled={updatingId === task.id}
                              onClick={() => updateTaskStatus(task, "cleaned")}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#159B43] px-3 text-xs font-semibold text-white hover:bg-[#118037] disabled:opacity-50"
                            >
                              {updatingId === task.id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Mark Cleaned
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
      </section>
    </div>
  );
}

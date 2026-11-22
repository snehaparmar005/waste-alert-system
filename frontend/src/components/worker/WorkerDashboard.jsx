import { openInMaps } from "../../utils/openMap";
import { useEffect, useState } from "react";
import { apiRequest, getSession, getImageUrl } from "../../api/client";

export default function WorkerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const user = getSession()?.user;

  const loadTasks = () => {
    setLoading(true);
    apiRequest("/api/reports")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Show active assigned tasks and completed cleanups
        setTasks(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleMarkCleaned = async (reportId) => {
    setUpdatingId(reportId);
    setError("");
    try {
      await apiRequest(`/api/reports/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cleaned" }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === reportId ? { ...t, status: "cleaned" } : t))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const openGoogleMaps = (lat, lng) => {
    const url = `https://google.com{lat},${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const assignedCount = tasks.filter(
    (t) => (t.status || "").toLowerCase() !== "cleaned"
  ).length;
  const completedCount = tasks.filter(
    (t) => (t.status || "").toLowerCase() === "cleaned"
  ).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#D9F2E3] to-[#C8EBD6] rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-emerald-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B4650]">
            Welcome, {user?.name || "Field Worker"}
          </h1>
          <p className="text-sm text-[#1E5648] mt-1 font-medium">
            Assigned Cleanup Tasks &amp; Live GPS Navigation
          </p>
        </div>
        <button
          type="button"
          onClick={loadTasks}
          className="bg-[#0B4650] hover:bg-[#08353d] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
        >
          Refresh Tasks
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{assignedCount}</p>
            <p className="text-xs text-gray-500 font-medium">Pending Pickup</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{completedCount}</p>
            <p className="text-xs text-gray-500 font-medium">Completed Cleanups</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-[#159B43] flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{tasks.length}</p>
            <p className="text-xs text-gray-500 font-medium">Total Ward Dispatches</p>
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0B4650]">Assigned Garbage Locations</h2>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl text-center text-sm text-gray-500 border border-gray-100">
            Loading assigned tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-sm text-gray-500 border border-gray-100">
            No garbage cleanup tasks assigned right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tasks.map((task) => {
              const isCleaned = (task.status || "").toLowerCase() === "cleaned";
              const categoryLabel = task.category?.label || task.waste_type || "General Waste";

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 bg-gray-100">
                      {task.image_url ? (
                        <img
                          src={getImageUrl(task.image_url)}
                          alt={`Report #${task.id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          No Photo Available
                        </div>
                      )}
                      <span
                        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          isCleaned
                            ? "bg-green-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400">
                          REPORT #{task.id}
                        </span>
                        <span className="bg-emerald-50 text-[#0B4650] text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                          {categoryLabel}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-gray-800">
                        {task.remarks || task.ward || "Street Garbage Pickup"}
                      </p>

                      <div className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        GPS: {task.latitude}, {task.longitude}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Open With Map + Mark Cleaned */}
                  <div className="p-4 pt-0 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => openInMaps(task.latitude, task.longitude)}
                      className="flex-1 bg-[#0B4650] hover:bg-[#08353d] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      Open with Map
                    </button>

                    {!isCleaned && (
                      <button
                        type="button"
                        disabled={updatingId === task.id}
                        onClick={() => handleMarkCleaned(task.id)}
                        className="flex-1 bg-[#159B43] hover:bg-[#118037] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        {updatingId === task.id ? "Updating..." : "Mark as Cleaned"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

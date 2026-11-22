import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { apiRequest, getSession } from "../../api/client";
import { openInMaps } from "../../utils/openMap";

export default function GovDashboard() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const user = getSession()?.user;

  useEffect(() => {
    apiRequest("/api/reports")
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  const total = reports.length;
  const resolved = reports.filter((r) =>
    ["cleaned", "resolved"].includes((r.status || "").toLowerCase())
  ).length;
  const inProgress = reports.filter(
    (r) => (r.status || "").toLowerCase() === "assigned"
  ).length;
  const pending = Math.max(0, total - resolved - inProgress);

  const getCategoryLabel = (r) =>
    r.category?.label || r.waste_type || "Uncategorized";

  const getCoords = (r) => {
    if (typeof r.latitude === "number" && typeof r.longitude === "number") {
      return [r.latitude, r.longitude];
    }
    const parts = (r.coordinates || "26.2183, 78.1828").split(",").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    return [26.2183, 78.1828];
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-gradient-to-r from-[#D9F2E3] via-[#E6F6EC] to-[#C8EBD6] rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-emerald-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B4650]">
            Welcome Back, {user?.name || "Nagar Nigam Officer"}!
          </h1>
          <p className="text-sm text-[#1E5648] mt-1 font-medium">
            Municipal Area Waste Monitoring & Cleanup Dispatch
          </p>
        </div>
        <Link
          to="/gov/reports"
          className="bg-[#159B43] hover:bg-[#118037] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
        >
          Manage Complaints →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-[#159B43] flex items-center justify-center text-xl">🗑️</div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500 font-medium">Total Complaints</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">⏳</div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{pending}</p>
            <p className="text-xs text-gray-500 font-medium">Pending</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-xl">✅</div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{resolved}</p>
            <p className="text-xs text-gray-500 font-medium">Cleaned</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">🚛</div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{inProgress}</p>
            <p className="text-xs text-gray-500 font-medium">Assigned</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-[#0B4650]">📍 Live Ward Map</h2>
          <Link to="/gov/reports" className="text-xs font-semibold text-[#159B43] hover:underline">
            View All →
          </Link>
        </div>
        <div className="h-80 rounded-xl overflow-hidden border border-gray-200">
          <MapContainer center={[26.2183, 78.1828]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r) => (
              <Marker key={r.id} position={getCoords(r)}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold">#{r.id} • {getCategoryLabel(r)}</p>
                    <p>Status: {r.status}</p> <p className="font-mono text-[11px]">GPS: {r.latitude}, {r.longitude}</p><button type="button" onClick={() => openInMaps(r.latitude, r.longitude)} className="mt-1 bg-[#0B4650] text-white text-[11px] font-semibold px-2 py-1 rounded">Open with Map</button>
                    <p className="font-mono text-[11px] text-gray-600">
  GPS: {r.latitude}, {r.longitude}
</p>
<button
  type="button"
  onClick={() => openInMaps(r.latitude, r.longitude)}
  className="mt-1 bg-[#0B4650] text-white text-[11px] font-semibold px-2.5 py-1 rounded block"
>
  Open with Map
</button>

                    <Link to={`/gov/report/${r.id}`} className="text-[#159B43] font-bold underline">
                      Inspect & Update →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

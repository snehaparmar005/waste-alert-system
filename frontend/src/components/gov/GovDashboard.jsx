import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { apiRequest } from "../../api/client";

export default function GovDashboard() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/reports")
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  const getCategoryLabel = (r) => r.category?.label || r.waste_type || "Uncategorized";

  const getCoords = (r) => {
    if (typeof r.latitude === "number" && typeof r.longitude === "number") {
      return [r.latitude, r.longitude];
    }
    const parts = (r.coordinates || "26.2183, 78.1828").split(",").map(Number);
    return parts.length === 2 && !isNaN(parts) && !isNaN(parts) ? parts : [26.2183, 78.1828];
  };

  const isCleaned = (status) => (status || "").toLowerCase() === "cleaned";
  const activeCount = reports.filter((r) => !isCleaned(r.status)).length;
  const cleanedCount = reports.filter((r) => isCleaned(r.status)).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0F4C5C]">Nagar Nigam Area Dashboard</h1>
        <Link
          to="/gov/reports"
          className="bg-[#2E9E5B] text-white px-4 py-2 rounded-xl text-sm font-semibold min-h-[44px] flex items-center"
        >
          Manage Complaints →
        </Link>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[#0F4C5C]">
          <p className="text-sm text-gray-500">Total Reports</p>
          <p className="text-3xl font-bold mt-1">{reports.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[#FBBF24]">
          <p className="text-sm text-gray-500">Reported / Assigned</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[#2E9E5B]">
          <p className="text-sm text-gray-500">Cleaned</p>
          <p className="text-3xl font-bold text-[#2E9E5B] mt-1">{cleanedCount}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-[#0F4C5C] mb-3">Live Jurisdiction Map</h2>
        <div className="h-96 rounded-xl overflow-hidden">
          <MapContainer center={[26.2183, 78.1828]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r) => (
              <Marker key={r.id} position={getCoords(r)}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold">#{r.id} • {getCategoryLabel(r)}</p>
                    <p>Status: {r.status}</p>
                    <Link to={`/gov/report/${r.id}`} className="text-[#0F4C5C] font-bold underline">
                      Inspect & Assign →
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

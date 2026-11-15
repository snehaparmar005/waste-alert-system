import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { apiRequest } from "../../api/client";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiRequest("/api/admin/summary"), apiRequest("/api/reports")])
      .then(([sumData, repData]) => {
        setSummary(sumData);
        setReports(repData);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F4C5C]">Admin Master Control Center</h1>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-xs text-gray-500 uppercase">Total Reports</p>
            <p className="text-3xl font-bold mt-1">{summary.total_reports}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-xs text-gray-500 uppercase">Cleanup Rate</p>
            <p className="text-3xl font-bold text-[#2E9E5B] mt-1">{summary.cleanup_rate}%</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-xs text-gray-500 uppercase">Active Wards</p>
            <p className="text-3xl font-bold text-[#0F4C5C] mt-1">{summary.total_wards}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-xs text-gray-500 uppercase">Registered Users</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{summary.total_users}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border">
        <h2 className="font-bold text-[#0F4C5C] mb-3">Master City Map</h2>
        <div className="h-80 rounded-xl overflow-hidden">
          <MapContainer center={[26.2183, 78.1828]} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r) => (
              <Marker key={r.id} position={[r.latitude, r.longitude]}>
                <Popup>#{r.id} • {r.category.label} ({r.status})</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

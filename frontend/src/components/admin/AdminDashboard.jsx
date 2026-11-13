import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/api/reports").then((res) => res.json()).then(setReports);
    fetch("/api/users").then((res) => res.json()).then(setUsers);
  }, []);

  const cleanedCount = reports.filter((r) => r.status === "Cleaned").length;
  const cleanedRate = reports.length ? Math.round((cleanedCount / reports.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Admin Control Center (Live)</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500 uppercase">Total Reports</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{reports.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500 uppercase">Cleaned Rate</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{cleanedRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500 uppercase">Registered Users</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{users.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500 uppercase">Pending Cleanup</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{reports.length - cleanedCount}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-gray-800">Master City Map (All Wards)</h2>
          <div className="flex gap-3 text-sm">
            <Link to="/admin/reports" className="text-emerald-600 font-semibold hover:underline">Reports</Link>
            <Link to="/admin/users" className="text-emerald-600 font-semibold hover:underline">Users</Link>
          </div>
        </div>
        <div className="h-80 rounded-xl overflow-hidden">
          <MapContainer center={[26.2183, 78.1828]} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r) => {
              const pos = (r.coordinates || "26.2183, 78.1828").split(",").map(Number);
              return (
                <Marker key={r.id} position={pos}>
                  <Popup>#{r.id} - {r.waste_type} ({r.status})</Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

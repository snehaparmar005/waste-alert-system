import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function GovDashboard() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetch("/api/reports").then((res) => res.json()).then(setReports);
  }, []);

  const parseCoords = (coordStr) => {
    const parts = (coordStr || "26.2183, 78.1828").split(",").map(Number);
    return parts.length === 2 && !isNaN(parts[0]) ? parts : [26.2183, 78.1828];
  };

  const pendingCount = reports.filter((r) => r.status !== "Cleaned").length;
  const cleanedCount = reports.filter((r) => r.status === "Cleaned").length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Nagar Nigam Live Dashboard</h1>
        <Link to="/gov/reports" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Manage Reports →</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-emerald-600">
          <p className="text-sm text-gray-500">Total Reports</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{reports.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-500">
          <p className="text-sm text-gray-500">Pending / Assigned</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-600">
          <p className="text-sm text-gray-500">Cleaned</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{cleanedCount}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border overflow-hidden">
        <h2 className="font-bold text-gray-800 mb-3">Interactive Gwalior Ward Map</h2>
        <div className="h-96 rounded-xl overflow-hidden z-0">
          <MapContainer center={[26.2183, 78.1828]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r) => (
              <Marker key={r.id} position={parseCoords(r.coordinates)}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold">Report #{r.id} ({r.waste_type})</p>
                    <p>{r.ward} • Status: {r.status}</p>
                    <Link to={`/gov/report/${r.id}`} className="text-emerald-600 font-bold underline">Update Status →</Link>
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

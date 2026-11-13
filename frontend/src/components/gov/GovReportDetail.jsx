import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

export default function GovReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReport(data.find((item) => String(item.id) === String(id))));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const res = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setReport({ ...report, status: newStatus });
      alert(`Report #${id} marked as ${newStatus}!`);
    }
  };

  if (!report) return <div className="p-6 text-gray-500">Loading report #{id}...</div>;

  const coords = (report.coordinates || "26.2183, 78.1828").split(",").map(Number);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link to="/gov/reports" className="text-sm text-emerald-600 font-semibold hover:underline">← Back to Area Reports</Link>

      <div className="bg-white rounded-2xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {report.image_url ? (
            <img src={report.image_url} alt="Reported Waste" className="h-56 w-full object-cover rounded-xl border" />
          ) : (
            <div className="h-56 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm border">No photo uploaded</div>
          )}

          <div className="h-44 rounded-xl overflow-hidden border">
            <MapContainer center={coords} zoom={15} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coords} />
            </MapContainer>
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Report #{report.id}</h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">Status: {report.status}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Category: <strong>{report.waste_type}</strong> • {report.ward}</p>
            <p className="text-sm text-gray-600 mt-4">{report.remarks || "No additional remarks."}</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button onClick={() => handleStatusChange("Assigned")} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm">
              Mark as Assigned
            </button>
            <button onClick={() => handleStatusChange("Cleaned")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm">
              Mark as Cleaned
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

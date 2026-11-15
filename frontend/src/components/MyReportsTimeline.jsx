import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";

export default function MyReportsTimeline() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    apiRequest("/api/reports")
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getCatLabel = (r) => r.category?.label || r.waste_type || "Uncategorized";

  const getCoordText = (r) => {
    if (typeof r.latitude === "number" && typeof r.longitude === "number") {
      return `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`;
    }
    return r.coordinates || "26.2183, 78.1828";
  };

  const getBadgeStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "cleaned") return "bg-green-100 text-green-800";
    if (s === "assigned") return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0F4C5C]">My Waste Reports</h1>
          <p className="text-sm text-gray-600">Track AI classification and cleanup progress</p>
        </div>
        <Link
          to="/report"
          className="bg-[#2E9E5B] hover:bg-[#248249] text-white px-4 py-2 rounded-xl text-sm font-semibold min-h-[44px] flex items-center"
        >
          + New Report
        </Link>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading your reports...</p>}

      {!loading && !error && reports.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border text-center text-sm text-gray-500">
          No reports submitted yet. Click <strong>+ New Report</strong> to get started.
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:border-[#0F4C5C] cursor-pointer transition flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
          >
            <div className="flex items-center gap-4">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={getCatLabel(r)}
                  className="w-20 h-20 rounded-xl object-cover border bg-gray-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border bg-[#EAF5EE] text-[#0F4C5C] flex items-center justify-center text-xs font-bold text-center p-2">
                  {getCatLabel(r)}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#0F4C5C]">Report #{r.id}</span>
                  <span className="text-xs bg-[#EAF5EE] text-[#0F4C5C] px-2.5 py-0.5 rounded-full font-semibold">
                    {getCatLabel(r)}
                    {typeof r.confidence === "number" ? ` (${(r.confidence * 100).toFixed(0)}%)` : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{r.remarks || "No landmark remarks"}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {r.ward || "Ward 12 - Morar"} • {getCoordText(r)}
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getBadgeStyle(r.status)}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#0F4C5C]">Report #{selected.id}</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close modal"
                className="text-gray-500 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={getCatLabel(selected)}
                className="w-full h-48 object-cover rounded-xl border"
              />
            )}

            <div className="text-sm space-y-1.5 text-gray-700">
              <p>
                <strong>Category:</strong> {getCatLabel(selected)}
                {typeof selected.confidence === "number" ? ` (${(selected.confidence * 100).toFixed(1)}% confidence)` : ""}
              </p>
              {selected.corrected_slug && (
                <p><strong>Citizen Correction:</strong> {selected.corrected_slug}</p>
              )}
              <p><strong>Status:</strong> <span className="uppercase font-bold">{selected.status}</span></p>
              <p><strong>Coordinates:</strong> {getCoordText(selected)}</p>
              <p><strong>Remarks:</strong> {selected.remarks || "None"}</p>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full bg-[#0F4C5C] text-white py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

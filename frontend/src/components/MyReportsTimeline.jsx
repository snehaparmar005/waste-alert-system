import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function MyReportsTimeline() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Waste Reports</h1>
          <p className="text-sm text-gray-500">Live status of your submitted complaints</p>
        </div>
        <Link
          to="/report"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + New Report
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading reports from server...</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedReport(r)}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-400 cursor-pointer transition flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">Report #{r.id}</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-medium">
                    {r.waste_type}
                  </span>
                  <span className="text-xs text-gray-400">• {r.ward}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.remarks || "No landmark notes provided."}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {r.coordinates} • {r.created_at}</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  r.status === "Cleaned"
                    ? "bg-green-100 text-green-700"
                    : r.status === "Assigned"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Report #{selectedReport.id} Details</h2>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Category:</strong> {selectedReport.waste_type}</p>
              <p><strong>Ward:</strong> {selectedReport.ward}</p>
              <p><strong>Coordinates:</strong> {selectedReport.coordinates}</p>
              <p><strong>Remarks:</strong> {selectedReport.remarks}</p>
              <p><strong>Date:</strong> {selectedReport.created_at}</p>
              <p><strong>Current Status:</strong> <span className="font-bold text-emerald-700">{selectedReport.status}</span></p>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

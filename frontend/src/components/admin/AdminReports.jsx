import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { openInMaps } from "../../utils/openMap";

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/reports")
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  const handleStatus = async (id, status) => {
    try {
      const updated = await apiRequest(`/api/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setReports(reports.map((r) => (r.id === id ? (updated?.id ? updated : { ...r, status }) : r)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/reports/${id}`, { method: "DELETE" });
      setReports(reports.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F4C5C]">All System Reports</h1>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Category</th>
              <th className="p-4">Confidence</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="p-4 font-bold">#{r.id}</td>
                <td className="p-4">{r.category?.label || r.waste_type || "Uncategorized"}</td>
                <td className="p-4">
                  {typeof r.confidence === "number" ? `${(r.confidence * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="p-4">
                  <select
                    value={r.status}
                    onChange={(e) => handleStatus(r.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs bg-white min-h-[36px]"
                  >
                    <option value="reported">reported</option>
                    <option value="assigned">assigned</option>
                    <option value="cleaned">cleaned</option>
                  </select>
                </td>
                <td className="p-4">
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 text-xs font-semibold hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";

export default function GovReports() {
  const [reports, setReports] = useState([]);
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/reports")
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  const getCatSlug = (r) => (r.category?.slug || r.waste_type || "").toLowerCase();
  const getCatLabel = (r) => r.category?.label || r.waste_type || "Uncategorized";

  const filtered = reports.filter((r) => {
    const matchCat = catFilter === "all" || getCatSlug(r) === catFilter;
    const matchStatus = statusFilter === "all" || (r.status || "").toLowerCase() === statusFilter;
    return matchCat && matchStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-[#0F4C5C]">Municipal Area Reports</h1>
        <div className="flex gap-3">
          <select
            aria-label="Filter by category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-h-[44px]"
          >
            <option value="all">All Categories</option>
            <option value="biodegradable">Biodegradable</option>
            <option value="hazardous">Hazardous</option>
            <option value="non_biodegradable">Non-biodegradable</option>
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-h-[44px]"
          >
            <option value="all">All Statuses</option>
            <option value="reported">Reported / Pending</option>
            <option value="assigned">Assigned</option>
            <option value="cleaned">Cleaned</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Category</th>
              <th className="p-4">Confidence</th>
              <th className="p-4">Ward</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">#{r.id}</td>
                <td className="p-4">{getCatLabel(r)}</td>
                <td className="p-4">
                  {typeof r.confidence === "number" ? `${(r.confidence * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="p-4">{r.ward || "Ward 12 - Morar"}</td>
                <td className="p-4 uppercase text-xs font-bold">{r.status}</td>
                <td className="p-4">
                  <Link to={`/gov/report/${r.id}`} className="text-[#0F4C5C] font-semibold hover:underline">
                    View & Update
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

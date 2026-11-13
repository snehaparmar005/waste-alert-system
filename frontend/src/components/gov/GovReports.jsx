import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function GovReports() {
  const [reports, setReports] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReports(data));
  }, []);

  const filtered = reports.filter((r) => {
    const matchCat = categoryFilter === "All" || r.waste_type === categoryFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchCat && matchStatus;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Area Waste Reports (Live)</h1>

        <div className="flex gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="All">All Categories</option>
            <option value="Plastic">Plastic</option>
            <option value="Organic">Organic</option>
            <option value="Construction">Construction</option>
            <option value="E-Waste">E-Waste</option>
            <option value="Garbage Pile">Garbage Pile</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="Cleaned">Cleaned</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Category</th>
              <th className="p-4">Ward</th>
              <th className="p-4">Remarks</th>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-4 font-semibold text-gray-800">#{r.id}</td>
                <td className="p-4">{r.waste_type}</td>
                <td className="p-4">{r.ward}</td>
                <td className="p-4 text-gray-600">{r.remarks}</td>
                <td className="p-4 text-gray-500">{r.created_at}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.status === "Cleaned"
                        ? "bg-green-100 text-green-700"
                        : r.status === "Assigned"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-4">
                  <Link to={`/gov/report/${r.id}`} className="text-emerald-600 font-semibold hover:underline">
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

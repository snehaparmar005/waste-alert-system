import { useState } from "react";

const SAMPLE_ALL = [
  { id: "R-101", ward: "Ward 12", category: "Plastic", status: "Pending" },
  { id: "R-102", ward: "Ward 12", category: "Organic", status: "Assigned" },
  { id: "R-103", ward: "Ward 14", category: "Construction", status: "Cleaned" },
];

export default function AdminReports() {
  const [reports, setReports] = useState(SAMPLE_ALL);

  const handleDelete = (id) => {
    setReports(reports.filter((r) => r.id !== id));
  };

  const handleStatusEdit = (id, newStatus) => {
    setReports(reports.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">All System Reports (Admin)</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Ward</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status (Editable)</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="p-4 font-bold">{r.id}</td>
                <td className="p-4">{r.ward}</td>
                <td className="p-4">{r.category}</td>
                <td className="p-4">
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusEdit(r.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Cleaned">Cleaned</option>
                  </select>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-600 hover:underline font-semibold text-xs"
                  >
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

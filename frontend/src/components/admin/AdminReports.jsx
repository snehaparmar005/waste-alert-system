import { useEffect, useState } from "react";

export default function AdminReports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReports(data));
  }, []);

  const handleStatusEdit = async (id, newStatus) => {
    const res = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setReports(reports.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReports(reports.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">All System Reports (Admin Live)</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Ward</th>
              <th className="p-4">Category</th>
              <th className="p-4">Remarks</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="p-4 font-bold">#{r.id}</td>
                <td className="p-4">{r.ward}</td>
                <td className="p-4">{r.waste_type}</td>
                <td className="p-4 text-gray-500">{r.remarks}</td>
                <td className="p-4">
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusEdit(r.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Cleaned">Cleaned</option>
                  </select>
                </td>
                <td className="p-4">
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline font-semibold text-xs">
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

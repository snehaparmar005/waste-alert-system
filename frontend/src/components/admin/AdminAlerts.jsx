// AdminAlerts.jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/admin/alerts").then(setAlerts).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F4C5C]">Alert Outbox & Delivery Logs</h1>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr><th className="p-4">Outbox ID</th><th className="p-4">Report</th><th className="p-4">Ward</th><th className="p-4">Channel</th><th className="p-4">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {alerts.map((a) => (
              <tr key={a.id}>
                <td className="p-4 font-mono text-xs">#{a.id}</td>
                <td className="p-4 font-bold">Report #{a.report_id}</td>
                <td className="p-4">{a.ward}</td>
                <td className="p-4">{a.channel}</td>
                <td className="p-4 uppercase text-xs font-bold">{a.delivery_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

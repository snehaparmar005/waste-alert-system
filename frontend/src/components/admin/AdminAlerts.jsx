import { useEffect, useState } from "react";

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">System Alert Delivery Logs (Live)</h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">Alert ID</th>
              <th className="p-4">Report</th>
              <th className="p-4">Target Ward</th>
              <th className="p-4">Channel</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {alerts.map((log) => (
              <tr key={log.id}>
                <td className="p-4 font-mono text-xs font-bold">{log.id}</td>
                <td className="p-4 font-semibold">#{log.reportId}</td>
                <td className="p-4">{log.ward}</td>
                <td className="p-4">{log.channel}</td>
                <td className="p-4 text-gray-500">{log.time}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

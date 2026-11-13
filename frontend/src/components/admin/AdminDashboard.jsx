import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Admin Control Center</h1>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Total Reports</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">142</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Cleaned Rate</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">78%</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Active Wards</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">18</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Registered Users</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">310</p>
        </div>
      </div>

      {/* Master City Map */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Master City Map (All Wards)</h2>
          <div className="flex gap-3 text-sm">
            <Link to="/admin/reports" className="text-emerald-600 font-semibold hover:underline">Manage Reports</Link>
            <Link to="/admin/users" className="text-emerald-600 font-semibold hover:underline">Manage Users</Link>
          </div>
        </div>
        <div className="h-72 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-center text-slate-500 text-sm">
          🗺️ City-Wide Heatmap & All Ward Pins Render Here
        </div>
      </div>
    </div>
  );
}

import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChartPie,
  CheckCircle2,
  Clock3,
  MapPin,
  Recycle,
  Trash2,
  Truck,
} from "lucide-react";
import { apiRequest, getPageResult, getSession } from "../../api/client";
import LazyRender from "../LazyRender";
import PaginationControls from "../PaginationControls";

const AdminReportsMap = lazy(() => import("./AdminReportsMap"));

function getStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

function getReferenceId(report) {
  return report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`;
}

function getStatusStyle(status) {
  if (status === "submitted") return "bg-slate-100 text-slate-700";
  if (status === "assigned") return "bg-amber-100 text-amber-800";
  if (status === "cleaned") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [mapReports, setMapReports] = useState([]);
  const [mapPage, setMapPage] = useState(1);
  const [mapTotalPages, setMapTotalPages] = useState(0);
  const [mapTotal, setMapTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = getSession()?.user;

  useEffect(() => {
    apiRequest(`/api/reports?page=${mapPage}&limit=20`)
      .then((response) => {
        const data = getPageResult(response);
        setMapReports(data.items);
        setMapTotalPages(data.total_pages);
        setMapTotal(data.total);
        if (mapPage === 1) {
          setReports(data.items);
          setSummary(data.summary);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (mapPage === 1) setLoading(false);
      });
  }, [mapPage]);

  const total = summary?.total || 0;
  const resolved = summary?.cleaned || 0;
  const inProgress = (summary?.assigned || 0) + (summary?.in_progress || 0);
  const pending = summary?.submitted || 0;

  const getLabel = (r) => r.category?.label || r.waste_type || "Uncategorized";

  const categoryCounts = summary?.categories || {};
  const bioCount = categoryCounts.biodegradable || 0;
  const nonBioCount = categoryCounts.non_biodegradable || 0;

  const bioPct = total ? Math.round((bioCount / total) * 100) : 0;
  const nonBioPct = total ? Math.round((nonBioCount / total) * 100) : 0;
  const hazPct = total ? Math.max(0, 100 - bioPct - nonBioPct) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#D9F2E3] to-[#C8EBD6] rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-emerald-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B4650]">
            Welcome Back, {user?.name || "System Admin"}!
          </h1>
          <p className="text-sm text-[#1E5648] mt-1 font-medium">
            Together for a Cleaner and Greener City
          </p>
        </div>
        <div className="bg-[#159B43] text-white px-4 py-3 rounded-2xl shadow-sm flex items-center gap-3">
          <Recycle className="h-7 w-7" />
          <div className="text-xs">
            <p className="font-bold">Smart Waste Engine</p>
            <p className="text-emerald-100">Live City Monitoring</p>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-[#159B43]"><Trash2 className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100" /> : total}
            </p>
            <p className="text-xs text-gray-500 font-medium">Total Complaints</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Clock3 className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100" /> : pending}
            </p>
            <p className="text-xs text-gray-500 font-medium">Pending</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100" /> : resolved}
            </p>
            <p className="text-xs text-gray-500 font-medium">Resolved</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Truck className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">
              {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100" /> : inProgress}
            </p>
            <p className="text-xs text-gray-500 font-medium">In Progress</p>
          </div>
        </div>
      </div>

      {/* Map + Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="inline-flex items-center gap-2 font-bold text-[#0B4650]"><MapPin className="h-4 w-4" /> Waste Reports Map</h2>
            <Link to="/admin/reports" className="text-xs font-semibold text-[#159B43] hover:underline">
              <span className="inline-flex items-center gap-1">View All <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          </div>
          <div className="h-72 w-full overflow-hidden rounded-xl border border-gray-200">
            <LazyRender fallback={<div className="h-full animate-pulse bg-gray-100" />}>
              <Suspense fallback={<div className="h-full animate-pulse bg-gray-100" />}>
                <AdminReportsMap reports={mapReports} />
              </Suspense>
            </LazyRender>
          </div>
          <PaginationControls
            page={mapPage}
            totalPages={mapTotalPages}
            total={mapTotal}
            onPageChange={setMapPage}
          />
        </div>

        <LazyRender fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h2 className="inline-flex items-center gap-2 font-bold text-[#0B4650]"><ChartPie className="h-4 w-4" /> Waste Category Distribution</h2>

          <div className="my-4 flex items-center justify-center">
            <div
              className="h-40 w-40 rounded-full flex items-center justify-center"
              style={{
                background: total
                  ? `conic-gradient(#159B43 0% ${bioPct}%, #2563EB ${bioPct}% ${bioPct + nonBioPct}%, #F59E0B ${bioPct + nonBioPct}% 100%)`
                  : "#E5E7EB",
              }}
            >
              <div className="h-24 w-24 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-[#0B4650]">{total}</span>
                <span className="text-[10px] text-gray-400 uppercase">Reports</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs font-medium text-gray-700">
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#159B43]"></span> Biodegradable
              </span>
              <span className="font-bold">{bioPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]"></span> Non-biodegradable
              </span>
              <span className="font-bold">{nonBioPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]"></span> Hazardous
              </span>
              <span className="font-bold">{hazPct}%</span>
            </div>
          </div>
        </div>
        </LazyRender>
      </div>

      {/* Recent Reports Table + CTA Card */}
      <LazyRender fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-[#0B4650]">Recent Reports</h2>
            <Link to="/admin/reports" className="text-xs font-semibold text-[#159B43] hover:underline">
              <span className="inline-flex items-center gap-1">View All <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 animate-pulse rounded bg-gray-100" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-xs text-gray-500 py-4">No reports recorded yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="p-3">Reference ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-[#0B4650]">{getReferenceId(r)}</td>
                    <td className="p-3">
                      <span className="bg-emerald-50 text-[#0B4650] px-2.5 py-1 rounded-full font-semibold">
                        {getLabel(r)}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{r.ward || "Gwalior"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${getStatusStyle(getStatus(r))}`}>
                        {getStatus(r).replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link to="/admin/reports" className="text-[#159B43] font-semibold hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[#0B4650] text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-extrabold leading-snug">A Cleaner City Starts With You!</h3>
            <p className="text-xs text-white/80 mt-2 leading-relaxed">
              Report waste, track ward cleanup teams in real time, and keep your neighborhood clean and green.
            </p>
          </div>
          <Link
            to="/admin/reports"
            className="mt-6 bg-[#159B43] hover:bg-[#118037] text-white text-center font-semibold py-2.5 px-4 rounded-xl text-xs transition inline-block"
          >
            <span className="inline-flex items-center justify-center gap-1">Inspect All Reports <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        </div>
      </div>
      </LazyRender>
    </div>
  );
}


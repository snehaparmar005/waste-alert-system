import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { apiRequest, getPageResult } from "../../api/client";
import MapResizeFix from "../MapResizeFix";

export default function GovReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    apiRequest(`/api/reports/${id}`)
      .then(setReport)
      .catch(() => {
        apiRequest("/api/reports?legacy=true&limit=100")
          .then((list) =>
            setReport(
              getPageResult(list).items.find((item) => String(item.id) === String(id)),
            ),
          )
          .catch((err) => setError(err.message));
      });
  }, [id]);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const updated = await apiRequest(`/api/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setReport(updated?.id ? updated : { ...report, status: newStatus });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (error) return <div role="alert" className="max-w-4xl mx-auto p-6 text-red-700">{error}</div>;
  if (!report) return <div className="max-w-4xl mx-auto p-6 text-gray-500">Loading report #{id}...</div>;

  const catLabel = report.category?.label || report.waste_type || "Uncategorized";
  const coords =
    typeof report.latitude === "number" && typeof report.longitude === "number"
      ? [report.latitude, report.longitude]
      : (report.coordinates || "26.2183, 78.1828").split(",").map(Number);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link to="/gov/reports" className="text-sm text-[#0F4C5C] font-semibold hover:underline">
        ← Back to Area Reports
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {report.image_url ? (
            <img
              src={report.image_url}
              alt={catLabel}
              loading="lazy"
              width="560"
              height="240"
              className="h-60 w-full object-cover rounded-xl border"
            />
          ) : (
            <div className="h-60 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm border">
              No photo uploaded
            </div>
          )}

          <div className="h-44 w-full overflow-hidden rounded-xl border">
            <MapContainer center={coords} zoom={15} style={{ height: "100%", width: "100%" }}>
              <MapResizeFix />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coords} />
            </MapContainer>
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-[#0F4C5C]">Report #{report.id}</h1>
              <span className="bg-[#EAF5EE] text-[#0F4C5C] text-xs font-bold px-3 py-1 rounded-full uppercase">
                {report.status}
              </span>
            </div>
            <p className="text-sm mt-2">
              <strong>Category:</strong> {catLabel}{" "}
              {typeof report.confidence === "number" ? `(${(report.confidence * 100).toFixed(1)}%)` : ""}
            </p>
            <p className="text-sm text-gray-600 mt-1"><strong>Ward:</strong> {report.ward || "Ward 12 - Morar"}</p>
            {report.user_name && <p className="text-sm text-gray-600 mt-1"><strong>Submitted by:</strong> {report.user_name}</p>}
            <p className="text-sm text-gray-700 mt-3 bg-gray-50 p-3 rounded-lg">{report.remarks || "No landmark remarks."}</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              disabled={updating}
              onClick={() => updateStatus("assigned")}
              className="flex-1 bg-[#FBBF24] hover:bg-amber-400 text-[#172B27] font-semibold py-2.5 rounded-xl text-sm min-h-[44px]"
            >
              Mark Assigned
            </button>
            <button
              disabled={updating}
              onClick={() => updateStatus("cleaned")}
              className="flex-1 bg-[#2E9E5B] hover:bg-[#248249] text-white font-semibold py-2.5 rounded-xl text-sm min-h-[44px]"
            >
              Mark Cleaned
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

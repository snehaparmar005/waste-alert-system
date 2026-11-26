import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { MapPin } from "lucide-react";
import { openInMaps } from "../../utils/openMap";
import MapResizeFix from "../MapResizeFix";

const MAP_CENTER = [26.2183, 78.1828];

function FitMapToReports({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) map.setView(positions[0], 14);
    else if (positions.length > 1) {
      map.fitBounds(positions, { padding: [24, 24], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

function getCoordinates(report) {
  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  if (
    report.latitude == null ||
    report.longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) return null;
  return [latitude, longitude];
}

function getStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

function getStatusStyle(status) {
  if (status === "submitted") return "bg-slate-100 text-slate-700";
  if (status === "assigned") return "bg-amber-100 text-amber-800";
  if (status === "cleaned") return "bg-emerald-100 text-emerald-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

export default function GovReportsMap({ reports }) {
  const positions = useMemo(
    () => reports.map(getCoordinates).filter((position) => position !== null),
    [reports],
  );

  return (
    <MapContainer center={MAP_CENTER} zoom={12} scrollWheelZoom className="h-full w-full">
      <MapResizeFix />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMapToReports positions={positions} />
      {reports.map((report) => {
        const coordinates = getCoordinates(report);
        if (!coordinates) return null;
        const status = getStatus(report);
        return (
          <Marker key={report.id} position={coordinates}>
            <Popup>
              <div className="space-y-2 text-xs">
                <p className="font-bold text-[#0B4650]">
                  {report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`} ·{" "}
                  {report.category?.label || report.category_slug || "Uncategorized"}
                </p>
                <span
                  className={`inline-flex rounded-full px-2 py-1 font-semibold ${getStatusStyle(status)}`}
                >
                  {status.replaceAll("_", " ")}
                </span>
                <button
                  type="button"
                  onClick={() => openInMaps(coordinates[0], coordinates[1])}
                  className="flex items-center gap-1 font-semibold text-[#159B43]"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Open in Maps
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { openInMaps } from "../../utils/openMap";

function getCoordinates(report) {
  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  if (
    report.latitude != null &&
    report.longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  ) return [latitude, longitude];

  const parts = (report.coordinates || "").split(",").map(Number);
  if (
    parts.length === 2 &&
    parts.every(Number.isFinite) &&
    parts[0] >= -90 &&
    parts[0] <= 90 &&
    parts[1] >= -180 &&
    parts[1] <= 180 &&
    !(parts[0] === 0 && parts[1] === 0)
  ) return parts;
  return null;
}

function getStatus(report) {
  const status = (report.status || "").toLowerCase();
  return status === "reported" ? "submitted" : status;
}

export default function AdminReportsMap({ reports }) {
  return (
    <MapContainer center={[26.2183, 78.1828]} zoom={13} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {reports.map((report) => {
        const coordinates = getCoordinates(report);
        if (!coordinates) return null;
        return (
          <Marker key={report.id} position={coordinates}>
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-bold">
                  {report.reference_id || `C2C-${String(report.id).padStart(3, "0")}`} ·{" "}
                  {report.category?.label || report.category_slug || "Uncategorized"}
                </p>
                <p>Status: {getStatus(report).replaceAll("_", " ")}</p>
                <p className="font-mono text-[11px]">GPS: {coordinates[0]}, {coordinates[1]}</p>
                <button
                  type="button"
                  onClick={() => openInMaps(coordinates[0], coordinates[1])}
                  className="mt-1 rounded bg-[#0B4650] px-2 py-1 text-[11px] font-semibold text-white"
                >
                  Open with Map
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

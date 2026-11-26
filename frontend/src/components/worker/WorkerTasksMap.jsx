import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { openInMaps } from "../../utils/openMap";

const MAP_CENTER = [26.2183, 78.1828];

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

function FitMapToTasks({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) map.setView(positions[0], 14);
    else if (positions.length > 1) {
      map.fitBounds(positions, { padding: [24, 24], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

export default function WorkerTasksMap({ tasks }) {
  const positions = useMemo(
    () => tasks.map(getCoordinates).filter((position) => position !== null),
    [tasks],
  );

  return (
    <MapContainer center={MAP_CENTER} zoom={12} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMapToTasks positions={positions} />
      {tasks.map((task) => {
        const coordinates = getCoordinates(task);
        if (!coordinates) return null;
        return (
          <Marker key={task.id} position={coordinates}>
            <Popup>
              <div className="space-y-1">
                <strong>{task.reference_id || `C2C-${String(task.id).padStart(3, "0")}`}</strong>
                <p>{task.remarks || task.description || "Cleanup location"}</p>
                <button
                  type="button"
                  className="font-semibold text-[#0B4650] underline"
                  onClick={() => openInMaps(coordinates[0], coordinates[1])}
                >
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

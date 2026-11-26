import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  FileImage,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MapPinned,
  Send,
  Sparkles,
} from "lucide-react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { apiRequest } from "../api/client";

const DEFAULT_CENTER = [26.2183, 78.1828];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function getDistanceInMeters(first, second) {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function LocationMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), 15), { animate: true });
    }
  }, [map, position]);

  useMapEvents({
    click(event) {
      onPositionChange(event.latlng.lat, event.latlng.lng);
    },
  });

  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (!marker) return;
    const point = marker.getLatLng();
    onPositionChange(point.lat, point.lng);
  };

  if (!position) return null;

  return (
    <Marker
      ref={markerRef}
      position={position}
      draggable
      eventHandlers={{ dragend: handleDragEnd }}
    >
      <Popup>Selected waste location. Drag the pin to adjust.</Popup>
    </Marker>
  );
}

export default function ReportWaste() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [detectedAddress, setDetectedAddress] = useState("Waiting for location.");
  const [locationNotice, setLocationNotice] = useState(
    "Requesting device location. You can also select a point on the map.",
  );
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsAnchor, setGpsAnchor] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationSource, setLocationSource] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const geocodeSequence = useRef(0);

  const position = useMemo(() => {
    if (!latitude || !longitude) return null;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  }, [latitude, longitude]);

  const hasValidLocation =
    position !== null &&
    position[0] >= -90 &&
    position[0] <= 90 &&
    position[1] >= -180 &&
    position[1] <= 180 &&
    !(position[0] === 0 && position[1] === 0);

  const locationConfidence = useMemo(() => {
    if (!position || !gpsAnchor || !Number.isFinite(gpsAccuracy) || gpsAccuracy <= 0) {
      return 0;
    }
    const distance = getDistanceInMeters(
      gpsAnchor,
      { latitude: position[0], longitude: position[1] },
    );
    return Math.max(0, Math.min(100, Math.round((1 - distance / gpsAccuracy) * 100)));
  }, [gpsAccuracy, gpsAnchor, position]);

  const fetchReadableAddress = useCallback(async (lat, lng) => {
    const requestId = geocodeSequence.current + 1;
    geocodeSequence.current = requestId;
    setGeocoding(true);
    setDetectedAddress("Looking up the selected location...");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat,
        )}&lon=${encodeURIComponent(lng)}`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!response.ok) {
        throw new Error(`Address lookup failed with status ${response.status}.`);
      }
      const data = await response.json();
      if (requestId !== geocodeSequence.current) return;
      setDetectedAddress(
        data?.display_name || "No street address found; the GPS coordinates will be used.",
      );
    } catch {
      if (requestId === geocodeSequence.current) {
        setDetectedAddress(
          "Address lookup is unavailable; the selected GPS coordinates will be used.",
        );
      }
    } finally {
      if (requestId === geocodeSequence.current) setGeocoding(false);
    }
  }, []);

  const detectDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsLoading(false);
      setLocationNotice(
        "Automatic location is unavailable in this browser. Click the map or drag the pin to set a location.",
      );
      return;
    }

    setGpsLoading(true);
    setLocationNotice("Detecting device GPS. You can still select a point on the map.");
    navigator.geolocation.getCurrentPosition(
      (location) => {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        const anchor = { latitude: lat, longitude: lng };
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setGpsAnchor(anchor);
        setGpsAccuracy(location.coords.accuracy);
        setLocationSource("gps");
        setGpsLoading(false);
        setLocationNotice(
          `Device GPS detected with reported accuracy of about ${Math.round(
            location.coords.accuracy,
          )} m. Drag the pin to fine-tune the location.`,
        );
        setError("");
        setResult(null);
        fetchReadableAddress(lat, lng);
      },
      (locationError) => {
        setGpsLoading(false);
        if (locationError.code === 1) {
          setLocationNotice(
            "Location permission was denied. Allow location access in your browser settings, or click the map to pin the site manually.",
          );
        } else {
          setLocationNotice(
            "Could not detect device GPS. Click the map to select the location manually or try again.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [fetchReadableAddress]);

  useEffect(() => {
    const detectionTimer = window.setTimeout(detectDeviceLocation, 0);
    return () => window.clearTimeout(detectionTimer);
  }, [detectDeviceLocation]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const handlePositionChange = (lat, lng) => {
    const nextLatitude = lat.toFixed(6);
    const nextLongitude = lng.toFixed(6);
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setLocationSource("manual");
    setLocationNotice(
      gpsAnchor
        ? "Pin adjusted manually. The percentage below compares it with your device GPS accuracy radius."
        : "Location selected manually. Drag the pin to fine-tune the exact spot.",
    );
    setResult(null);
    setError("");
    fetchReadableAddress(nextLatitude, nextLongitude);
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please take or upload a photo of the garbage first.");
      return;
    }
    if (!hasValidLocation) {
      setError("Select a valid GPS location before submitting your report.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("latitude", String(position[0]));
      formData.append("longitude", String(position[1]));
      formData.append("remarks", remarks);
      formData.append("description", description);

      const created = await apiRequest("/api/reports", {
        method: "POST",
        body: formData,
      });
      setResult(created);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const stepItems = [
    {
      title: "Image Upload",
      description: file ? file.name : "Choose a photo of the waste.",
      Icon: FileImage,
      complete: Boolean(file),
      active: !file,
    },
    {
      title: "AI Waste Classification",
      description: result
        ? `Classified as ${result.category?.label || "waste"}.`
        : loading
          ? "Analyzing the uploaded image..."
          : "AI classification runs when you submit.",
      Icon: Sparkles,
      complete: Boolean(result),
      active: loading,
    },
    {
      title: "Geocoding Verification Agent",
      description: hasValidLocation
        ? `${detectedAddress} GPS confidence match: ${locationConfidence}%.`
        : "Detect GPS or click the map to verify a location.",
      Icon: MapPinned,
      complete: hasValidLocation && !geocoding,
      active: geocoding,
    },
    {
      title: "Submit Report",
      description: result
        ? "Report submitted successfully."
        : "Submission unlocks when an image and valid location are selected.",
      Icon: Send,
      complete: Boolean(result),
      active: Boolean(file && hasValidLocation && !result),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
          Citizen Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-800">Report Waste</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Add a photo, verify the location on the map, and submit a report for cleanup.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800">
            Processing &amp; Geocoding Verification
          </h2>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stepItems.map(({ title, description: stepDescription, Icon, complete, active }, index) => {
            const stepStyles = [
              // Step 1: Soft Blue
              {
                complete: "border-sky-300/80 bg-sky-50/70",
                active: "border-sky-400 bg-sky-50/40",
                iconComplete: "bg-sky-600 text-white",
                iconDefault: "bg-sky-100 text-sky-700",
              },
              // Step 2: Lavender
              {
                complete: "border-indigo-300/80 bg-indigo-50/70",
                active: "border-indigo-400 bg-indigo-50/40",
                iconComplete: "bg-indigo-600 text-white",
                iconDefault: "bg-indigo-100 text-indigo-700",
              },
              // Step 3: Dusty Pink
              {
                complete: "border-rose-300/80 bg-rose-50/70",
                active: "border-rose-400 bg-rose-50/40",
                iconComplete: "bg-rose-500 text-white",
                iconDefault: "bg-rose-100 text-rose-700",
              },
              // Step 4: Muted Teal
              {
                complete: "border-teal-300/80 bg-teal-50/70",
                active: "border-teal-400 bg-teal-50/40",
                iconComplete: "bg-teal-700 text-white",
                iconDefault: "bg-teal-100 text-teal-800",
              },
            ][index] || {
              complete: "border-teal-300 bg-teal-50",
              active: "border-slate-300 bg-slate-50",
              iconComplete: "bg-teal-700 text-white",
              iconDefault: "bg-teal-100 text-teal-800",
            };

            return (
              <li
                key={title}
                className={`rounded-2xl border p-4 transition ${
                  complete
                    ? stepStyles.complete
                    : active
                      ? stepStyles.active
                      : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                      complete
                        ? stepStyles.iconComplete
                        : stepStyles.iconDefault
                    }`}
                  >
                    {complete ? (
                      <Check className="h-4 w-4" />
                    ) : active && loading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">{title}</h3>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                  {stepDescription}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div>
            <label
              htmlFor="waste-photo"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Waste Photo
            </label>
            <input
              id="waste-photo"
              type="file"
              accept="image/*"
              capture="environment"
              required={!file}
              onChange={handleFileChange}
              className="w-full rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50/50 via-purple-50/30 to-rose-50/30 p-2.5 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:font-semibold file:text-white"
            />
            {preview && (
              <img
                src={preview}
                alt="Selected waste"
                className="mt-3 h-56 w-full rounded-2xl border border-slate-200 object-cover shadow-xs"
              />
            )}
          </div>

          <div>
            <label
              htmlFor="report-description"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Description
            </label>
            <textarea
              id="report-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the waste or cleanup needed."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="report-remarks"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Nearby Landmark or Remarks
            </label>
            <input
              id="report-remarks"
              type="text"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="For example, near the bus stand"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <MapPin className="h-5 w-5 text-teal-600" />
                Verify Location
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Drag the pin or click the map to mark the exact waste location.
              </p>
            </div>
            <button
              type="button"
              onClick={detectDeviceLocation}
              disabled={gpsLoading}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-wait disabled:opacity-60"
            >
              {gpsLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4 text-teal-700" />
              )}
              Detect Current Location
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={position ? 15 : 12}
              scrollWheelZoom
              className="h-72 w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker
                position={position}
                onPositionChange={handlePositionChange}
              />
            </MapContainer>
          </div>

          <p
            role="status"
            className={`text-xs leading-relaxed ${
              locationSource === "gps" ? "text-teal-800" : "text-rose-700"
            }`}
          >
            {locationNotice}
          </p>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-sky-50/60 via-purple-50/40 to-teal-50/50 p-3.5">
            <p className="text-sm font-semibold text-slate-800">
              {geocoding ? "Verifying address..." : detectedAddress}
            </p>
            {hasValidLocation ? (
              <>
                <p className="mt-1.5 font-mono text-xs text-slate-500">
                  {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
                <p className="mt-1.5 text-xs font-semibold text-teal-800">
                  GPS confidence match: {locationConfidence}%
                  {gpsAccuracy ? ` (device accuracy radius: ±${Math.round(gpsAccuracy)} m)` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-rose-700">
                A valid location is required. Select a point on the map to continue.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !file || !hasValidLocation}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading ? "Classifying and submitting..." : "Submit Report"}
          </button>
        </section>
      </form>

      {result && (
        <section
          role="status"
          className="rounded-3xl border border-teal-300/80 bg-teal-50/80 p-5 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <div>
              <h2 className="font-bold text-slate-800">
                Report {result.reference_id || `C2C-${String(result.id).padStart(3, "0")}`} submitted
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                AI classification: {result.category?.label || "Complete"}
                {typeof result.confidence === "number"
                  ? ` (${(result.confidence * 100).toFixed(1)}% confidence)`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Location saved: {result.latitude}, {result.longitude}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { apiRequest } from "../api/client";

export default function ReportWaste() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [detectedAddress, setDetectedAddress] = useState("Detecting your device location...");
  const [gpsLoading, setGpsLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const fetchReadableAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://openstreetmap.org{lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data?.display_name) {
        setDetectedAddress(data.display_name);
      } else {
        setDetectedAddress(`Coordinates: ${lat}, ${lng}`);
      }
    } catch {
      setDetectedAddress(`Coordinates: ${lat}, ${lng}`);
    }
  };

  const detectDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGpsLoading(false);
      setError("Your browser does not support automatic location detection.");
      return;
    }

    setGpsLoading(true);
    setDetectedAddress("Detecting your exact device location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setGpsLoading(false);
        setError("");
        fetchReadableAddress(lat, lng);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setError("Location permission was blocked. Click the lock icon in your browser address bar and set Location to Allow.");
        } else {
          setError("Could not lock onto device GPS. Turn on Windows/Phone Location Services and tap Refresh.");
        }
        setDetectedAddress("Location not detected yet");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectDeviceLocation();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please take or upload a photo of the garbage first.");
      return;
    }
    if (!latitude || !longitude) {
      setError("Please allow device location access before submitting.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("latitude", parseFloat(latitude));
      formData.append("longitude", parseFloat(longitude));
      formData.append("remarks", remarks || detectedAddress);

      const created = await apiRequest("/api/reports", {
        method: "POST",
        body: formData,
      });

      setResult(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-[#0B4650]">Report Garbage</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Snap a photo—your device location and waste type are detected automatically.
        </p>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              1. Capture or Upload Garbage Photo
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="w-full text-sm border border-gray-300 rounded-xl p-2.5 bg-gray-50"
            />
            {preview && (
              <img
                src={preview}
                alt="Waste preview"
                className="mt-3 h-52 w-full object-cover rounded-xl border"
              />
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#F4F7F6] border border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B4650]">
                📍 Automatic Device Location
              </span>
              <button
                type="button"
                onClick={detectDeviceLocation}
                disabled={gpsLoading}
                className="text-xs bg-white border border-gray-300 text-[#0B4650] font-semibold px-3 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {gpsLoading ? "Detecting..." : "Refresh Location"}
              </button>
            </div>

            <p className="text-sm font-medium text-gray-800 leading-snug">
              {detectedAddress}
            </p>

            {latitude && longitude && (
              <p className="text-xs text-gray-500">
                GPS Coordinates: <span className="font-mono font-semibold">{latitude}, {longitude}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              2. Nearby Landmark (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Near bus stand, behind vegetable market"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || gpsLoading}
            className="w-full bg-[#159B43] hover:bg-[#118037] text-white font-semibold py-3 rounded-xl text-sm shadow-sm disabled:opacity-50"
          >
            {loading ? "Analyzing Waste & Submitting..." : "Submit Report"}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-5 rounded-2xl bg-[#EAF5EE] border border-[#159B43]/30 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#159B43]">
              ✅ Report #{result.id} Sent to Nagar Nigam
            </p>
            <p className="text-lg font-extrabold text-[#0B4650]">
              Detected Waste: {result.category?.label} ({(result.confidence * 100).toFixed(1)}%)
            </p>
            <p className="text-xs text-gray-600">
              Location Saved: {result.latitude}, {result.longitude}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

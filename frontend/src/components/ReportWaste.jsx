import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ReportWaste() {
  const [wasteType, setWasteType] = useState("Plastic");
  const [ward, setWard] = useState("Ward 12 - Morar");
  const [coordinates, setCoordinates] = useState("");
  const [remarks, setRemarks] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setCoordinates("26.2183, 78.1828");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setCoordinates(`${lat}, ${lng}`);
      },
      () => {
        // Fallback coordinates if location permission is blocked
        setCoordinates("26.2183, 78.1828");
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waste_type: wasteType,
          coordinates: coordinates || "26.2183, 78.1828",
          ward: ward,
          remarks: remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to submit report.");
        setLoading(false);
        return;
      }

      alert(`Report #${data.data.id} submitted! Nagar Nigam alert sent.`);
      navigate("/my-reports");
    } catch (err) {
      setError("Cannot reach backend server on port 8000.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Report Waste Issue</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Upload a waste photo, capture GPS location, and alert Nagar Nigam.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload & Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Waste Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {preview && (
              <img
                src={preview}
                alt="Waste Preview"
                className="mt-3 h-48 w-full object-cover rounded-xl border border-gray-200"
              />
            )}
          </div>

          {/* AI / Waste Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Waste Category
              </label>
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="Plastic">Plastic Waste</option>
                <option value="Organic">Organic / Food Waste</option>
                <option value="Construction">Construction Debris</option>
                <option value="E-Waste">E-Waste</option>
                <option value="Garbage Pile">Mixed Garbage Pile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipal Ward
              </label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="Ward 12 - Morar">Ward 12 - Morar</option>
                <option value="Ward 14 - City Center">Ward 14 - City Center</option>
                <option value="Ward 15 - Lashkar">Ward 15 - Lashkar</option>
              </select>
            </div>
          </div>

          {/* GPS Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GPS Coordinates
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Click Capture GPS or enter coordinates"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleCaptureLocation}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-lg text-xs border border-blue-200 transition"
              >
                📍 Capture GPS
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Landmark / Remarks
            </label>
            <textarea
              rows="3"
              placeholder="Describe the exact spot or nearby landmark..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition shadow-sm disabled:opacity-50"
          >
            {loading ? "Submitting Report..." : "Submit Waste Report"}
          </button>
        </form>
      </div>
    </div>
  );
}

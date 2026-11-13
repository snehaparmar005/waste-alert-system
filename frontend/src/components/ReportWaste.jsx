import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ReportWaste() {
  const [wasteType, setWasteType] = useState("Plastic");
  const [ward, setWard] = useState("Ward 12 - Morar");
  const [coordinates, setCoordinates] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setCoordinates("26.2183, 78.1828");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoordinates(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
      () => setCoordinates("26.2183, 78.1828")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("waste_type", wasteType);
    formData.append("coordinates", coordinates || "26.2183, 78.1828");
    formData.append("ward", ward);
    formData.append("remarks", remarks);
    if (photoFile) formData.append("photo", photoFile);

    const res = await fetch("/api/reports", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      alert(`Report #${data.data.id} saved with photo! Nagar Nigam alert sent.`);
      navigate("/my-reports");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Report Waste Issue</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Upload a waste photo, capture GPS location, and alert Nagar Nigam.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Waste Photo</label>
            <input type="file" accept="image/*" onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700" />
            {preview && <img src={preview} alt="Preview" className="mt-3 h-48 w-full object-cover rounded-xl border" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waste Category</label>
              <select value={wasteType} onChange={(e) => setWasteType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="Plastic">Plastic Waste</option>
                <option value="Organic">Organic / Food Waste</option>
                <option value="Construction">Construction Debris</option>
                <option value="E-Waste">E-Waste</option>
                <option value="Garbage Pile">Mixed Garbage Pile</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Municipal Ward</label>
              <select value={ward} onChange={(e) => setWard(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="Ward 12 - Morar">Ward 12 - Morar</option>
                <option value="Ward 14 - City Center">Ward 14 - City Center</option>
                <option value="Ward 15 - Lashkar">Ward 15 - Lashkar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GPS Coordinates</label>
            <div className="flex gap-2">
              <input type="text" required placeholder="Click Capture GPS" value={coordinates} onChange={(e) => setCoordinates(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={handleCaptureLocation} className="bg-blue-50 text-blue-700 font-semibold px-4 py-2 rounded-lg text-xs border border-blue-200">
                📍 Capture GPS
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Landmark / Remarks</label>
            <textarea rows="3" placeholder="Describe the exact spot..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg">
            {loading ? "Uploading Report..." : "Submit Waste Report"}
          </button>
        </form>
      </div>
    </div>
  );
}

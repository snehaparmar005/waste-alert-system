import { useState } from "react";
import { Link } from "react-router-dom";

const MOCK_PINS = [
  { id: "R-101", category: "Plastic", lat: 26.2183, lng: 78.1828, status: "Pending", ward: "Ward 12 - Morar", color: "bg-red-500" },
  { id: "R-102", category: "Organic", lat: 26.2235, lng: 78.1790, status: "Assigned", ward: "Ward 12 - Morar", color: "bg-amber-500" },
  { id: "R-103", category: "Construction", lat: 26.2150, lng: 78.1910, status: "Cleaned", ward: "Ward 14 - City Center", color: "bg-blue-500" },
  { id: "R-104", category: "E-Waste", lat: 26.2201, lng: 78.1865, status: "Pending", ward: "Ward 12 - Morar", color: "bg-purple-500" },
];

export default function GovDashboard() {
  const [selectedPin, setSelectedPin] = useState(MOCK_PINS[0]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nagar Nigam Area Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of waste reports assigned to your jurisdiction</p>
        </div>
        <Link to="/gov/reports" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">
          Manage All Reports →
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-emerald-600">
          <p className="text-sm text-gray-500">Total Area Reports</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">24</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-500">
          <p className="text-sm text-gray-500">Pending / Assigned</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">9</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-600">
          <p className="text-sm text-gray-500">Cleaned This Week</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">15</p>
        </div>
      </div>

      {/* Interactive Map Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="font-bold text-gray-800">Live Area Map (Pins by Category)</h2>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span>Plastic</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span>Organic</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span>Construction</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500"></span>E-Waste</span>
          </div>
        </div>

        {/* Visual Map Canvas Placeholder (Ready for Leaflet/Google Maps) */}
        <div className="relative h-80 bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {MOCK_PINS.map((pin, idx) => (
            <button
              key={pin.id}
              onClick={() => setSelectedPin(pin)}
              style={{ top: `${25 + idx * 15}%`, left: `${20 + idx * 18}%` }}
              className={`absolute ${pin.color} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transform hover:scale-110 transition`}
            >
              📍 {pin.id} ({pin.category})
            </button>
          ))}

          {selectedPin && (
            <div className="absolute bottom-4 left-4 bg-white p-4 rounded-xl shadow-md border border-gray-200 max-w-xs">
              <p className="text-xs font-bold text-emerald-700">{selectedPin.id} • {selectedPin.ward}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">Category: {selectedPin.category}</p>
              <p className="text-xs text-gray-500">Status: {selectedPin.status}</p>
              <Link to={`/gov/report/${selectedPin.id}`} className="inline-block mt-2 text-xs text-emerald-600 font-bold hover:underline">
                Open Report Action →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-[85vh] bg-gray-50 flex flex-col justify-center items-center text-center px-4">
      <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
        Smart City Waste Reporting
      </span>
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 max-w-2xl leading-tight">
        Spot Waste. Snap a Photo. Keep Your City Clean.
      </h1>
      <p className="text-gray-600 mt-4 max-w-xl text-base md:text-lg">
        Click-2-Clean uses AI to classify street garbage, capture GPS coordinates, and alert Nagar Nigam teams immediately.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          to="/report"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow"
        >
          Report Waste Now
        </Link>
        <Link
          to="/login"
          className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-xl font-semibold"
        >
          Login to Account
        </Link>
      </div>
    </div>
  );
}

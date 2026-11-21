import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, saveSession } from "../api/client";

export default function LoginCard({ onAuthSuccess }) {
  const [email, setEmail] = useState("citizen@test.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveSession(data);
      onAuthSuccess(data);

      const role = data?.user?.role;
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "gov") navigate("/gov/dashboard");
      else if (role === "worker") navigate("/worker/dashboard");
      else navigate("/report");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#0B4650]">Sign In</h1>
          <p className="text-xs text-gray-500 mt-1">
            Access Click-2-Clean Smart City Portal
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl mb-4 border border-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#EEF4FF] border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#159B43]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#EEF4FF] border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#159B43]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B4650] hover:bg-[#08353d] text-white font-semibold py-3 rounded-xl text-sm shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 text-center mb-3">
            Fill Test Credentials
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => fillDemo("citizen@test.com")}
              className="py-2 px-2 rounded-lg bg-[#EAF5EE] text-[#159B43] hover:bg-emerald-100 transition"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => fillDemo("officer@nagarnigam.gov.in")}
              className="py-2 px-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
            >
              Nagar Nigam
            </button>
            <button
              type="button"
              onClick={() => fillDemo("worker@nagarnigam.gov.in")}
              className="py-2 px-2 rounded-lg bg-teal-50 text-[#0B4650] hover:bg-teal-100 transition"
            >
              Worker
            </button>
            <button
              type="button"
              onClick={() => fillDemo("admin@nagarnigam.gov.in")}
              className="py-2 px-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 mt-5">
          Need a citizen account?{" "}
          <Link to="/register" className="text-[#159B43] font-bold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

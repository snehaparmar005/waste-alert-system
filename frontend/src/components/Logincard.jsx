import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, saveSession } from "../api/client";

export default function LoginCard({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fillAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const normalizedSession = data.user
        ? data
        : {
            token: data.token,
            user: {
              name: data.name || email.split("@")[0],
              email: data.email || email,
              role: data.role,
            },
          };

      saveSession(normalizedSession);
      onLoginSuccess(normalizedSession);

      const userRole = normalizedSession.user.role;
      if (userRole === "citizen") navigate("/report");
      else if (userRole === "gov") navigate("/gov/dashboard");
      else if (userRole === "admin") navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-[#0F4C5C] text-center">Sign In</h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-6">
          Access Click-2-Clean Smart City Portal
        </p>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium mb-1">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="login-pass" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="login-pass"
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F4C5C] hover:bg-[#0b3945] text-white font-semibold py-2.5 rounded-lg min-h-[44px] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Quick-fill helpers that still authenticate via MySQL backend */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center mb-2.5">
            Fill Local Test Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillAccount("citizen@test.com")}
              className="bg-[#EAF5EE] hover:bg-emerald-100 text-[#0F4C5C] text-xs font-semibold py-2 rounded-lg"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => fillAccount("officer@nagarnigam.gov.in")}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold py-2 rounded-lg"
            >
              Nagar Nigam
            </button>
            <button
              type="button"
              onClick={() => fillAccount("admin@nagarnigam.gov.in")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 rounded-lg"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="text-sm text-center text-gray-600 mt-5">
          Need a citizen account?{" "}
          <Link to="/register" className="text-[#2E9E5B] font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

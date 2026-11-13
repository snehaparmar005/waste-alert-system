import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginCard({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("citizen");
  const navigate = useNavigate();

  const handleLogin = (roleToLogin) => {
    // Update App.jsx state and localStorage
    if (onLoginSuccess) {
      onLoginSuccess(roleToLogin);
    }

    // Redirect based on role
    if (roleToLogin === "citizen") {
      navigate("/report");
    } else if (roleToLogin === "gov") {
      navigate("/gov/dashboard");
    } else if (roleToLogin === "admin") {
      navigate("/admin/dashboard");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // You can replace this with your FastAPI backend login call later
    handleLogin(selectedRole);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to Click-2-Clean to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Role (For Testing)
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="citizen">Citizen (User)</option>
              <option value="gov">Nagar Nigam Officer (Gov)</option>
              <option value="admin">System Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
          >
            Login
          </button>
        </form>

        {/* Quick 1-Click Role Testers */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <p className="text-xs text-center text-gray-400 uppercase font-semibold mb-3">
            Quick Demo Login (1-Click)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleLogin("citizen")}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-2 rounded-lg border border-emerald-200 transition"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => handleLogin("gov")}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold py-2 rounded-lg border border-amber-200 transition"
            >
              Nagar Nigam
            </button>
            <button
              type="button"
              onClick={() => handleLogin("admin")}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold py-2 rounded-lg border border-purple-200 transition"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="text-sm text-center text-gray-600 mt-6">
          New to Click-2-Clean?{" "}
          <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

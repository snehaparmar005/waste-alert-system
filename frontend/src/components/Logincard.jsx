import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginCard({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
     const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      // Save token & role
      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userName", data.name);
      if (onLoginSuccess) onLoginSuccess(data.role);

      // Redirect based on backend role
      if (data.role === "citizen") navigate("/report");
      else if (data.role === "gov") navigate("/gov/dashboard");
      else if (data.role === "admin") navigate("/admin/dashboard");
    } catch (err) {
      setError("Cannot reach backend server. Make sure FastAPI is running on port 8000.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 text-center">Welcome Back</h2>
        <p className="text-sm text-gray-500 text-center mt-1 mb-6">Sign in to Click-2-Clean</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="citizen@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="password123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg"
          >
            Login
          </button>
        </form>

        <div className="mt-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700">Demo Accounts (Password: password123):</p>
          <p>• Citizen: <code>citizen@test.com</code></p>
          <p>• Gov: <code>officer@nagarnigam.gov.in</code></p>
          <p>• Admin: <code>admin@nagarnigam.gov.in</code></p>
        </div>

        <p className="text-sm text-center text-gray-600 mt-5">
          New here? <Link to="/register" className="text-emerald-600 font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

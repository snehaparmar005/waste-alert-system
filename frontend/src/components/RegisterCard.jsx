import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";

export default function RegisterCard() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-[#0F4C5C]">Create Citizen Account</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Join Click-2-Clean to report and track local waste.</p>

        {error && <div role="alert" className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4 border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium mb-1">Full Name</label>
            <input id="reg-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium mb-1">Email</label>
            <input id="reg-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>
          <div>
            <label htmlFor="reg-pass" className="block text-sm font-medium mb-1">Password (min 6 characters)</label>
            <input id="reg-pass" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#2E9E5B] hover:bg-[#248249] text-white font-semibold py-2.5 rounded-lg min-h-[44px] disabled:opacity-50">
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-5">
          Already registered? <Link to="/login" className="text-[#0F4C5C] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

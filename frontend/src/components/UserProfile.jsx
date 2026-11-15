import { useEffect, useState } from "react";
import { apiRequest, getSession, saveSession } from "../api/client";

export default function UserProfile({ onProfileUpdate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/profile")
      .then((u) => { setName(u.name); setEmail(u.email); })
      .catch((err) => setError(err.message));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setStatusMsg("");
    try {
      const updated = await apiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, password: password || null }),
      });
      const current = getSession();
      if (current) saveSession({ ...current, user: updated });
      if (onProfileUpdate) onProfileUpdate(updated);
      setPassword("");
      setStatusMsg("Profile saved to MySQL database.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-5">
        <h1 className="text-2xl font-bold text-[#0F4C5C]">Account Profile</h1>
        {error && <div role="alert" className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">{error}</div>}
        {statusMsg && <div role="status" className="bg-[#EAF5EE] text-[#0F4C5C] text-xs p-3 rounded-lg border border-[#2E9E5B]/30">{statusMsg}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Email</label>
            <input type="text" disabled value={email} className="w-full bg-gray-100 border rounded-lg px-3 py-2 text-sm text-gray-500 min-h-[44px]" />
          </div>
          <div>
            <label htmlFor="prof-name" className="block text-sm font-medium mb-1">Display Name</label>
            <input id="prof-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>
          <div>
            <label htmlFor="prof-pass" className="block text-sm font-medium mb-1">New Password (Optional)</label>
            <input id="prof-pass" type="password" minLength={6} placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm min-h-[44px]" />
          </div>
          <button type="submit" className="w-full bg-[#0F4C5C] text-white font-semibold py-2.5 rounded-lg min-h-[44px]">
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}

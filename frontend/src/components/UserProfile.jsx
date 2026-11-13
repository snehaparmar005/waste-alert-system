import { useState } from "react";

export default function UserProfile() {
  const email = localStorage.getItem("userEmail") || "citizen@test.com";
  const [name, setName] = useState(localStorage.getItem("userName") || "Citizen User");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password: password || null }),
    });
    if (res.ok) {
      localStorage.setItem("userName", name);
      setPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        {saved && <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-200">Profile saved to database!</div>}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email (Read-Only)</label>
            <input type="text" disabled value={email} className="w-full bg-gray-100 border rounded-lg px-3 py-2 text-sm text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password (Leave blank to keep current)</label>
            <input type="password" placeholder="Enter new password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}

// AdminAuthorities.jsx
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export default function AdminAuthorities() {
  const [wards, setWards] = useState([]);
  const [form, setForm] = useState({ ward: "", email: "", telegram: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/admin/wards").then(setWards).catch((err) => setError(err.message));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const created = await apiRequest("/api/admin/wards", { method: "POST", body: JSON.stringify(form) });
      setWards([...wards, created]);
      setForm({ ward: "", email: "", telegram: "" });
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F4C5C]">Municipal Wards & Alert Contacts</h1>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-3">
        <input type="text" required placeholder="Ward Name" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} className="border rounded-lg px-3 py-2 text-sm flex-1 min-h-[44px]" />
        <input type="email" required placeholder="Official Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm flex-1 min-h-[44px]" />
        <input type="text" required placeholder="Telegram Handle" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} className="border rounded-lg px-3 py-2 text-sm flex-1 min-h-[44px]" />
        <button type="submit" className="bg-[#0F4C5C] text-white px-5 py-2 rounded-lg text-sm font-semibold min-h-[44px]">+ Save Ward</button>
      </form>
      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr><th className="p-4">Ward</th><th className="p-4">Email</th><th className="p-4">Telegram</th></tr>
          </thead>
          <tbody className="divide-y">
            {wards.map((w) => (
              <tr key={w.id}><td className="p-4 font-semibold">{w.ward}</td><td className="p-4">{w.email}</td><td className="p-4 font-mono text-xs">{w.telegram}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

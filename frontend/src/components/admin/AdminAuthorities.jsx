import { useEffect, useState } from "react";

export default function AdminAuthorities() {
  const [wards, setWards] = useState([]);
  const [form, setForm] = useState({ ward: "", email: "", telegram: "" });

  useEffect(() => {
    fetch("/api/wards")
      .then((res) => res.json())
      .then((data) => setWards(data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const result = await res.json();
      setWards([...wards, result.data]);
      setForm({ ward: "", email: "", telegram: "" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Nagar Nigam Wards & Alert Contacts</h1>

      <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-3">
        <input
          type="text"
          required
          placeholder="Ward Name (e.g. Ward 15)"
          value={form.ward}
          onChange={(e) => setForm({ ...form, ward: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <input
          type="email"
          required
          placeholder="Officer Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <input
          type="text"
          required
          placeholder="Telegram Chat ID / Handle"
          value={form.telegram}
          onChange={(e) => setForm({ ...form, telegram: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">
          + Save Ward
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">Ward</th>
              <th className="p-4">Official Email</th>
              <th className="p-4">Telegram Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {wards.map((w) => (
              <tr key={w.id}>
                <td className="p-4 font-semibold">{w.ward}</td>
                <td className="p-4">{w.email}</td>
                <td className="p-4 text-blue-600 font-mono text-xs">{w.telegram}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

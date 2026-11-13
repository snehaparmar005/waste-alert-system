import { useState } from "react";

const INITIAL_WARDS = [
  { id: 1, ward: "Ward 12 - Morar", email: "ward12.nn@gov.in", telegram: "@ward12_alert_bot" },
  { id: 2, ward: "Ward 14 - City Center", email: "ward14.nn@gov.in", telegram: "@ward14_alert_bot" },
];

export default function AdminAuthorities() {
  const [wards, setWards] = useState(INITIAL_WARDS);
  const [form, setForm] = useState({ ward: "", email: "", telegram: "" });

  const handleAdd = (e) => {
    e.preventDefault();
    setWards([...wards, { id: Date.now(), ...form }]);
    setForm({ ward: "", email: "", telegram: "" });
  };

  const handleDelete = (id) => {
    setWards(wards.filter((w) => w.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Nagar Nigam Wards & Alert Contacts</h1>
        <p className="text-sm text-gray-500">Configure municipal wards, official emails, and Telegram alert handles.</p>
      </div>

      {/* Add Ward Form */}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-3">
        <input
          type="text"
          required
          placeholder="Ward Name (e.g. Ward 15)"
          value={form.ward}
          onChange={(e) => setForm({ ...form, ward: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <input
          type="email"
          required
          placeholder="Officer Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <input
          type="text"
          required
          placeholder="Telegram Chat ID / Handle"
          value={form.telegram}
          onChange={(e) => setForm({ ...form, telegram: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
        >
          + Save Ward
        </button>
      </form>

      {/* Wards Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">Ward</th>
              <th className="p-4">Official Email</th>
              <th className="p-4">Telegram Contact</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {wards.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="p-4 font-semibold text-gray-800">{w.ward}</td>
                <td className="p-4 text-gray-600">{w.email}</td>
                <td className="p-4 text-blue-600 font-mono text-xs">{w.telegram}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-red-600 text-xs font-semibold hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

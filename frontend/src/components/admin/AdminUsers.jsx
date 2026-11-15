import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "password123", role: "citizen" });
  const [error, setError] = useState("");

  const load = () => apiRequest("/api/admin/users").then(setUsers).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "password123", role: "citizen" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleRole = async (id, role) => {
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) { setError(err.message); }
  };

  const handleRemove = async (id) => {
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: "DELETE" });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F4C5C]">Staff & User Management</h1>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-3">
        <input type="text" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm flex-1 min-h-[44px]" />
        <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm flex-1 min-h-[44px]" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-white min-h-[44px]">
          <option value="citizen">Citizen</option>
          <option value="gov">Gov Officer</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="bg-[#2E9E5B] text-white px-5 py-2 rounded-lg text-sm font-semibold min-h-[44px]">+ Add User</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Action</th></tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4 font-semibold">{u.name}</td>
                <td className="p-4 text-gray-500">{u.email}</td>
                <td className="p-4">
                  <select value={u.role} onChange={(e) => handleRole(u.id, e.target.value)} className="border rounded px-2 py-1 text-xs bg-white min-h-[36px]">
                    <option value="citizen">citizen</option>
                    <option value="gov">gov</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="p-4"><button onClick={() => handleRemove(u.id)} className="text-red-600 text-xs font-semibold hover:underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

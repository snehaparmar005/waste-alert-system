import { useEffect, useState } from "react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "password123", role: "citizen" });

  const loadUsers = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setNewUser({ name: "", email: "", password: "password123", role: "citizen" });
      loadUsers();
    }
  };

  const handleRoleChange = async (email, newRole) => {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers(users.map((u) => (u.email === email ? { ...u, role: newRole } : u)));
    }
  };

  const handleRemove = async (email) => {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((u) => u.email !== email));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">User & Officer Management (Live)</h1>

      <form onSubmit={handleAddUser} className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-3">
        <input
          type="text"
          required
          placeholder="Full Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="citizen">Citizen</option>
          <option value="gov">Gov Officer</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">
          + Add Account
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.email}>
                <td className="p-4 font-semibold">{u.name}</td>
                <td className="p-4 text-gray-500">{u.email}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.email, e.target.value)}
                    className="border rounded px-2 py-1 text-xs font-medium bg-white"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="gov">Gov Officer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  <button onClick={() => handleRemove(u.email)} className="text-red-600 text-xs font-semibold hover:underline">
                    Remove
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

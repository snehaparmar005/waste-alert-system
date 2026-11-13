import { useState } from "react";

const INITIAL_USERS = [
  { id: 1, name: "Aarav Sharma", email: "aarav@example.com", role: "citizen" },
  { id: 2, name: "Officer Verma", email: "verma.nn@gov.in", role: "gov" },
  { id: 3, name: "Super Admin", email: "admin@click2clean.in", role: "admin" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "citizen" });

  const handleAddUser = (e) => {
    e.preventDefault();
    setUsers([...users, { id: Date.now(), ...newUser }]);
    setNewUser({ name: "", email: "", role: "citizen" });
  };

  const handleRoleChange = (id, newRole) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
  };

  const handleRemove = (id) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">User & Officer Management</h1>
        <p className="text-sm text-gray-500">Add new accounts, update access roles, or remove users.</p>
      </div>

      {/* Add New User Form */}
      <form onSubmit={handleAddUser} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-3">
        <input
          type="text"
          required
          placeholder="Full Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="citizen">Citizen</option>
          <option value="gov">Gov Officer</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
        >
          + Add Account
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4 font-semibold text-gray-800">{u.name}</td>
                <td className="p-4 text-gray-500">{u.email}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="border border-gray-300 rounded px-2.5 py-1 text-xs font-medium bg-white"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="gov">Gov Officer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleRemove(u.id)}
                    className="text-red-600 text-xs font-semibold hover:underline"
                  >
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

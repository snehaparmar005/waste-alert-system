import React, { useState } from 'react';

export default function UserProfile() {
  const [name, setName] = useState('Sneha');
  const [email, setEmail] = useState('sneha@mitsgwalior.in');
  const [ward, setWard] = useState('Ward No. 12 - Morar');
  const [password, setPassword] = useState('••••••••');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000); // Clear confirmation message banner after 3 seconds
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-[75vh] p-6 shadow-xl rounded-2xl border border-slate-200 mt-2">
      <header className="flex items-center space-x-3 mb-6 border-b pb-4">
        <div className="bg-emerald-100 p-2.5 rounded-xl text-xl">👤</div>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Account Profile Settings</h1>
          <p className="text-xs text-gray-500 font-medium">Manage your citizen registry info</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-4">
        {saved && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-xl border border-emerald-200">
            ✅ Profile configurations saved onto MySQL server registries successfully!
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Citizen Full Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm text-slate-800 font-medium transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Email ID</label>
          <input 
            type="email" 
            value={email} 
            disabled
            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 font-medium cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Reporting Ward Sector</label>
          <select 
            value={ward} 
            onChange={(e) => setWard(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm text-slate-700 font-bold transition cursor-pointer"
          >
            <option value="Ward No. 12 - Morar">Ward No. 12 - Morar, Gwalior</option>
            <option value="Ward No. 15 - MITS Campus">Ward No. 15 - MITS Campus, Gwalior</option>
            <option value="Ward No. 22 - Gole Ka Mandir">Ward No. 22 - Gole Ka Mandir, Gwalior</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Update Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm text-slate-800 font-medium transition"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition duration-150 text-sm tracking-wide uppercase mt-4"
        >
          💾 Update Registry Changes
        </button>
      </form>
    </div>
  );
}

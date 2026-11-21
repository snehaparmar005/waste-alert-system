import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiRequest, clearSession } from "../api/client";

function BrandLogo({ className = "h-10 w-10" }) {
  return (
    <svg
      xmlns="http://w3.org"
      viewBox="0 0 200 210"
      className={`${className} rounded-xl bg-white p-1 shrink-0`}
    >
      <path d="M 65 162 A 42 15 0 1 0 135 162" fill="none" stroke="#159B43" strokeWidth="11" strokeLinecap="round" />
      <path d="M 100 42 C 66 42 39 69 39 103 C 39 144 100 182 100 182 C 100 182 161 144 161 103 C 161 69 134 42 100 42 Z" fill="#0B4650" />
      <circle cx="100" cy="102" r="35" fill="#FFFFFF" />
      <circle cx="100" cy="102" r="26" fill="#0B4650" />
      <circle cx="91" cy="94" r="7" fill="#FFFFFF" />
      <path d="M 80 104 A 20 20 0 0 1 98 83" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="111" cy="110" r="4.5" fill="#F8C31C" />
      <path d="M 103 44 C 101 20 120 5 148 6 C 147 32 131 46 108 45 C 117 34 127 25 137 18 C 125 23 113 33 103 44 Z" fill="#159B43" />
      <path d="M 122 50 C 134 35 152 31 168 37 C 161 53 145 59 125 53 C 136 49 146 45 156 42 C 145 43 133 46 122 50 Z" fill="#159B43" />
    </svg>
  );
}

function NavIcon({ name }) {
  const cls = "w-4 h-4 shrink-0";
  switch (name) {
    case "camera":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "list":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "home":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "users":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "pin":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "bell":
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

export default function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const role = user?.role;

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Clear local session regardless
    }
    clearSession();
    onLogout();
    navigate("/login");
  };

  const navItemsByRole = {
    citizen: [
      { to: "/report", label: "Report Waste", icon: "camera" },
      { to: "/my-reports", label: "My Reports", icon: "list" },
      { to: "/profile", label: "Settings & Profile", icon: "settings" },
    ],
    gov: [
      { to: "/gov/dashboard", label: "Dashboard", icon: "home" },
      { to: "/gov/reports", label: "Manage Complaints", icon: "list" },
    ],
    admin: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "home" },
      { to: "/admin/reports", label: "Manage Complaints", icon: "list" },
      { to: "/admin/users", label: "Staff Management", icon: "users" },
      { to: "/admin/authorities", label: "Wards & Map", icon: "pin" },
      { to: "/admin/alerts", label: "Notifications", icon: "bell" },
    ],

  worker: [
  { to: "/worker/dashboard", label: "Assigned Tasks", icon: "pin" },
],
  }

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F7F6] text-[#172B27]">
        <header className="bg-[#0B4650] text-white px-6 py-3.5 shadow-sm flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <div>
              <span className="font-brand text-xl font-extrabold block leading-none">
                Click-<span className="text-[#F8C31C]">2</span>-Clean
              </span>
              <span className="text-[11px] uppercase tracking-widest text-emerald-200">
                Snap. Sort. Alert.
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="hover:text-[#F8C31C]">Home</Link>
            <Link to="/login" className="hover:text-[#F8C31C]">Login</Link>
            <Link to="/register" className="bg-[#159B43] hover:bg-[#118037] text-white px-4 py-2 rounded-lg font-semibold">
              Register
            </Link>
          </div>
        </header>
        <main className="flex-grow">{children}</main>
      </div>
    );
  }

  const links = navItemsByRole[role] || [];

  return (
    <div className="min-h-screen flex bg-[#F4F7F6] text-[#172B27]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B4650] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <BrandLogo className="h-11 w-11" />
            <div>
              <span className="font-brand text-lg font-extrabold tracking-tight block leading-tight">
                Click-<span className="text-[#F8C31C]">2</span>-Clean
              </span>
              <span className="text-[11px] text-emerald-200 tracking-wide">Snap. Sort. Alert.</span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5 text-sm font-medium">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    isActive
                      ? "bg-[#159B43] text-white font-semibold shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs font-semibold text-emerald-200">Cleaner City</p>
            <p className="text-xs text-white/70">Greener Tomorrow</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/90 hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-semibold transition"
          >
            Logout ({user.name})
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg border text-gray-600"
              aria-label="Toggle Sidebar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="relative w-full">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />

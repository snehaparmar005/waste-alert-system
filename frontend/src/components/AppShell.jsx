import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiRequest, clearSession } from "../api/client";

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
      { to: "/report", label: "Report Waste", icon: "📷" },
      { to: "/my-reports", label: "My Reports", icon: "📋" },
      { to: "/profile", label: "Settings & Profile", icon: "⚙️" },
    ],
    gov: [
      { to: "/gov/dashboard", label: "Dashboard", icon: "🏠" },
      { to: "/gov/reports", label: "Manage Complaints", icon: "📋" },
    ],
    admin: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
      { to: "/admin/reports", label: "Manage Complaints", icon: "📋" },
      { to: "/admin/users", label: "Staff Management", icon: "👥" },
      { to: "/admin/authorities", label: "Wards & Map", icon: "📍" },
      { to: "/admin/alerts", label: "Notifications", icon: "🔔" },
    ],
  };

  // Public visitors (not logged in) keep a clean top navigation bar
  if (!role) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F7F6] text-[#172B27]">
        <header className="bg-[#0B4650] text-white px-6 py-3.5 shadow-sm flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="Click-2-Clean" className="h-10 w-10 rounded-xl bg-white p-1" />
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
      {/* Left Deep Teal Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B4650] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <img src="/logo-icon.svg" alt="Click-2-Clean" className="h-11 w-11 rounded-xl bg-white p-1 object-contain" />
            <div>
              <span className="font-brand text-lg font-extrabold tracking-tight block leading-tight">
                Click-<span className="text-[#F8C31C]">2</span>-Clean
              </span>
              <span className="text-[11px] text-emerald-200 tracking-wide">Snap. Sort. Alert.</span>
            </div>
          </div>

          {/* Sidebar Navigation Links */}
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
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar Slogan & Logout */}
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

      {/* Right Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top White Header Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg border text-gray-600"
              aria-label="Toggle Sidebar"
            >
              ☰
            </button>
            <div className="relative w-full">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints, locations..."
                className="w-full bg-[#F4F7F6] border border-gray-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#159B43]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={role === "admin" ? "/admin/alerts" : role === "gov" ? "/gov/reports" : "/my-reports"}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              title="Notifications"
            >
              🔔
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
            </Link>

            <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
              <div className="h-9 w-9 rounded-full bg-[#0B4650] text-white font-bold text-sm flex items-center justify-center uppercase">
                {(user.name || "U")}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-bold text-gray-800">{user.name}</p>
                <p className="text-[11px] text-gray-500 capitalize">
                  {role === "gov" ? "Nagar Nigam" : role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

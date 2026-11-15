import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, clearSession } from "../api/client";

export default function AppShell({ user, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

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

  const role = user?.role;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7FAF8] text-[#172B27]">
      {/* Header & Navigation */}
      <header className="bg-[#0F4C5C] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#FBBF24] rounded-lg">
            <img src="/logo-icon.svg" alt="Click-2-Clean logo" className="h-10 w-10 rounded-lg bg-white p-1 object-contain" />

            <div>
              <span className="font-brand text-xl font-extrabold tracking-tight block leading-none">
                Click-<span className="text-[#FBBF24]">2</span>-Clean
              </span>
              <span className="text-[11px] uppercase tracking-widest text-[#EAF5EE] font-medium">
                Snap. Sort. Alert.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6 text-sm font-medium">
            {!role && (
              <>
                <Link to="/" className="hover:text-[#FBBF24] transition">Home</Link>
                <Link to="/login" className="hover:text-[#FBBF24] transition">Login</Link>
                <Link to="/register" className="bg-[#2E9E5B] hover:bg-[#25834b] text-white px-4 py-2 rounded-lg font-semibold transition">
                  Register
                </Link>
              </>
            )}

            {role === "citizen" && (
              <>
                <Link to="/report" className="hover:text-[#FBBF24] transition">Report Waste</Link>
                <Link to="/my-reports" className="hover:text-[#FBBF24] transition">My Reports</Link>
                <Link to="/profile" className="hover:text-[#FBBF24] transition">Profile</Link>
              </>
            )}

            {role === "gov" && (
              <>
                <Link to="/gov/dashboard" className="hover:text-[#FBBF24] transition">Dashboard</Link>
                <Link to="/gov/reports" className="hover:text-[#FBBF24] transition">Area Reports</Link>
              </>
            )}

            {role === "admin" && (
              <>
                <Link to="/admin/dashboard" className="hover:text-[#FBBF24] transition">Dashboard</Link>
                <Link to="/admin/reports" className="hover:text-[#FBBF24] transition">Reports</Link>
                <Link to="/admin/users" className="hover:text-[#FBBF24] transition">Staff & Users</Link>
                <Link to="/admin/authorities" className="hover:text-[#FBBF24] transition">Wards</Link>
                <Link to="/admin/alerts" className="hover:text-[#FBBF24] transition">Alerts</Link>
              </>
            )}

            {role && (
              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">
                  {user.name} ({role})
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[36px]"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label="Toggle Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <nav className="md:hidden px-4 pb-4 space-y-2 text-sm border-t border-white/15 pt-3">
            {!role && (
              <>
                <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2">Home</Link>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2">Login</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-[#FBBF24] font-semibold">Register</Link>
              </>
            )}
            {role === "citizen" && (
              <>
                <Link to="/report" onClick={() => setMenuOpen(false)} className="block py-2">Report Waste</Link>
                <Link to="/my-reports" onClick={() => setMenuOpen(false)} className="block py-2">My Reports</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2">Profile</Link>
              </>
            )}
            {role === "gov" && (
              <>
                <Link to="/gov/dashboard" onClick={() => setMenuOpen(false)} className="block py-2">Dashboard</Link>
                <Link to="/gov/reports" onClick={() => setMenuOpen(false)} className="block py-2">Area Reports</Link>
              </>
            )}
            {role === "admin" && (
              <>
                <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="block py-2">Dashboard</Link>
                <Link to="/admin/reports" onClick={() => setMenuOpen(false)} className="block py-2">Reports</Link>
                <Link to="/admin/users" onClick={() => setMenuOpen(false)} className="block py-2">Users</Link>
                <Link to="/admin/authorities" onClick={() => setMenuOpen(false)} className="block py-2">Wards</Link>
                <Link to="/admin/alerts" onClick={() => setMenuOpen(false)} className="block py-2">Alerts</Link>
              </>
            )}
            {role && (
              <button onClick={handleLogout} className="w-full text-left py-2 text-red-300 font-semibold">
                Logout ({user.name})
              </button>
            )}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">{children}</main>

      {/* Shared Footer */}
      <footer className="bg-[#0F4C5C] text-white/80 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-brand font-bold text-white text-sm">Click-2-Clean • Snap. Sort. Alert.</p>
            <p className="mt-0.5 text-white/70">Powered by Smart City Waste Intelligence</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/report" className="hover:text-white">Report Waste</Link>
            <Link to="/login" className="hover:text-white">Staff Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

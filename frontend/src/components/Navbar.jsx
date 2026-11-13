import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ role, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <nav className="bg-emerald-700 text-white px-6 py-4 shadow-md flex justify-between items-center">
      <Link to="/" className="text-xl font-bold tracking-wide flex items-center gap-2">
        ♻️ Click-2-Clean
      </Link>

      <div className="flex items-center gap-5 text-sm font-medium">
        {!role && (
          <>
            <Link to="/" className="hover:text-emerald-200">Home</Link>
            <Link to="/login" className="hover:text-emerald-200">Login</Link>
            <Link
              to="/register"
              className="bg-white text-emerald-700 px-4 py-1.5 rounded-lg font-semibold hover:bg-emerald-50"
            >
              Sign Up
            </Link>
          </>
        )}

        {role === "citizen" && (
          <>
            <Link to="/report" className="hover:text-emerald-200">Report Waste</Link>
            <Link to="/my-reports" className="hover:text-emerald-200">My Reports</Link>
            <Link to="/profile" className="hover:text-emerald-200">Profile</Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white"
            >
              Logout
            </button>
          </>
        )}

        {role === "gov" && (
          <>
            <Link to="/gov/dashboard" className="hover:text-emerald-200">Dashboard</Link>
            <Link to="/gov/reports" className="hover:text-emerald-200">Area Reports</Link>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded">
              Logout
            </button>
          </>
        )}

        {role === "admin" && (
          <>
            <Link to="/admin/dashboard" className="hover:text-emerald-200">Dashboard</Link>
            <Link to="/admin/reports" className="hover:text-emerald-200">Reports</Link>
            <Link to="/admin/users" className="hover:text-emerald-200">Users</Link>
            <Link to="/admin/authorities" className="hover:text-emerald-200">Wards</Link>
            <Link to="/admin/alerts" className="hover:text-emerald-200">Alerts</Link>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

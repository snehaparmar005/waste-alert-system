import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Public & Shared Components
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";

// Citizen Components
import ReportWaste from "./components/ReportWaste";
import MyReportsTimeline from "./components/MyReportsTimeline";
import UserProfile from "./components/UserProfile";

// Government (Nagar Nigam) Components
import GovDashboard from "./components/gov/GovDashboard";
import GovReports from "./components/gov/GovReports";
import GovReportDetail from "./components/gov/GovReportDetail";

// Admin Components
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminReports from "./components/admin/AdminReports";
import AdminUsers from "./components/admin/AdminUsers";
import AdminAuthorities from "./components/admin/AdminAuthorities";
import AdminAlerts from "./components/admin/AdminAlerts";

export default function App() {
  const [role, setRole] = useState(localStorage.getItem("userRole") || null);

  const handleLoginSuccess = (selectedRole) => {
    setRole(selectedRole);
    localStorage.setItem("userRole", selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
    localStorage.removeItem("userRole");
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar role={role} onLogout={handleLogout} />

        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterCard />} />
            <Route
              path="/login"
              element={
                <LoginCard
                  onLoginSuccess={handleLoginSuccess}
                  loginSuccess={handleLoginSuccess}
                  loginsuccess={handleLoginSuccess}
                />
              }
            />

            {/* Citizen Routes */}
            <Route
              path="/report"
              element={role === "citizen" ? <ReportWaste /> : <Navigate to="/login" />}
            />
            <Route
              path="/my-reports"
              element={role === "citizen" ? <MyReportsTimeline /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile"
              element={role === "citizen" ? <UserProfile /> : <Navigate to="/login" />}
            />

            {/* Government Routes */}
            <Route
              path="/gov/dashboard"
              element={role === "gov" ? <GovDashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/gov/reports"
              element={role === "gov" ? <GovReports /> : <Navigate to="/login" />}
            />
            <Route
              path="/gov/report/:id"
              element={role === "gov" ? <GovReportDetail /> : <Navigate to="/login" />}
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={role === "admin" ? <AdminDashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/admin/reports"
              element={role === "admin" ? <AdminReports /> : <Navigate to="/login" />}
            />
            <Route
              path="/admin/users"
              element={role === "admin" ? <AdminUsers /> : <Navigate to="/login" />}
            />
            <Route
              path="/admin/authorities"
              element={role === "admin" ? <AdminAuthorities /> : <Navigate to="/login" />}
            />
            <Route
              path="/admin/alerts"
              element={role === "admin" ? <AdminAlerts /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSession } from "./api/client";
import AppShell from "./components/AppShell";
import HomePage from "./components/HomePage";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import ReportWaste from "./components/ReportWaste";
import MyReports from "./components/MyReports";
import ProfileSettings from "./components/ProfileSettings";
import GovDashboard from "./components/gov/GovDashboard";
import GovReports from "./components/gov/GovReports";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminReports from "./components/admin/AdminReports";
import AdminUsers from "./components/admin/AdminUsers";
import AdminAuthorities from "./components/admin/AdminAuthorities";
import AdminAlerts from "./components/admin/AdminAlerts";
import WorkerDashboard from "./components/worker/WorkerDashboard";

function getHomePath(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "gov") return "/gov/dashboard";
  if (role === "worker") return "/worker/dashboard";
  return "/report";
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const user = session?.user || null;

  const handleAuthSuccess = (newSession) => setSession(newSession);
  const handleLogout = () => setSession(null);

  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={handleLogout}>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to={getHomePath(user.role)} replace /> : <HomePage />}
          />
          <Route
            path="/login"
            element={user ? <Navigate to={getHomePath(user.role)} replace /> : <LoginCard onAuthSuccess={handleAuthSuccess} />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to={getHomePath(user.role)} replace /> : <RegisterCard onAuthSuccess={handleAuthSuccess} />}
          />

          {/* Citizen Routes */}
          <Route
            path="/report"
            element={user?.role === "citizen" ? <ReportWaste /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/my-reports"
            element={user?.role === "citizen" ? <MyReports /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={user ? <ProfileSettings /> : <Navigate to="/login" replace />}
          />

          {/* Worker Route */}
          <Route
            path="/worker/dashboard"
            element={user?.role === "worker" ? <WorkerDashboard /> : <Navigate to="/login" replace />}
          />

          {/* Nagar Nigam Routes */}
          <Route
            path="/gov/dashboard"
            element={user?.role === "gov" ? <GovDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/gov/reports"
            element={user?.role === "gov" ? <GovReports /> : <Navigate to="/login" replace />}
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={user?.role === "admin" ? <AdminDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/reports"
            element={user?.role === "admin" ? <AdminReports /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/users"
            element={user?.role === "admin" ? <AdminUsers /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/authorities"
            element={user?.role === "admin" ? <AdminAuthorities /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/alerts"
            element={user?.role === "admin" ? <AdminAlerts /> : <Navigate to="/login" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

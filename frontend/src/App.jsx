import { useState } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { getSession } from "./api/client";
import Home from "@/pages/Home.jsx";
import Report from "@/pages/Report.jsx";
import Admin from "@/pages/Admin.jsx";
import AppShell from "./components/AppShell";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import ReportWaste from "./components/ReportWaste";
import MyReportsTimeline from "./components/MyReportsTimeline";
import UserProfile from "./components/UserProfile";
import GovDashboard from "./components/gov/GovDashboard";
import GovReports from "./components/gov/GovReports";
import GovWorkers from "./components/gov/GovWorkers";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminReports from "./components/admin/AdminReports";
import AdminUsers from "./components/admin/AdminUsers";
import AdminAuditLogs from "./components/admin/AdminAuditLogs";
import AdminAuthorities from "./components/admin/AdminAuthorities";
import AdminAlerts from "./components/admin/AdminAlerts";
import WorkerDashboard from "./components/worker/WorkerDashboard";

function getHomePath(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "gov") return "/gov/dashboard";
  if (role === "worker") return "/worker/dashboard";
  return "/citizen/report";
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-ink">404</h1>
        <p className="mt-3 text-lg text-body">That page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const user = session?.user || null;

  const handleAuthSuccess = (newSession) => setSession(newSession);
  const handleLogout = () => setSession(null);
  const handleProfileUpdate = (updatedUser) => {
    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            user: { ...(currentSession.user || {}), ...updatedUser },
          }
        : currentSession,
    );
  };

  const withShell = (element) => (
    <AppShell user={user} onLogout={handleLogout}>
      {element}
    </AppShell>
  );

  return (
    <Routes>
      {/* New Landing UI & Quick Flows */}
      <Route path="/" element={<Home />} />
      <Route path="/report" element={<Report />} />
      <Route path="/admin" element={<Admin />} />

      {/* Portal Auth */}
      <Route
        path="/login"
        element={user ? <Navigate to={getHomePath(user.role)} replace /> : <LoginCard onAuthSuccess={handleAuthSuccess} />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to={getHomePath(user.role)} replace /> : <RegisterCard onAuthSuccess={handleAuthSuccess} />}
      />

      {/* Citizen Portal */}
      <Route
        path="/citizen/report"
        element={user?.role === "citizen" ? withShell(<ReportWaste />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/my-reports"
        element={user?.role === "citizen" ? withShell(<MyReportsTimeline />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/profile"
        element={user ? withShell(<UserProfile onProfileUpdate={handleProfileUpdate} />) : <Navigate to="/login" replace />}
      />

      {/* Worker Portal */}
      <Route
        path="/worker/dashboard"
        element={user?.role === "worker" ? withShell(<WorkerDashboard />) : <Navigate to="/login" replace />}
      />

      {/* Gov (Nagar Nigam) Portal */}
      <Route
        path="/gov/dashboard"
        element={user?.role === "gov" ? withShell(<GovDashboard />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/gov/reports"
        element={user?.role === "gov" ? withShell(<GovReports />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/gov/workers"
        element={user?.role === "gov" ? withShell(<GovWorkers />) : <Navigate to="/login" replace />}
      />

      {/* Admin Portal */}
      <Route
        path="/admin/dashboard"
        element={user?.role === "admin" ? withShell(<AdminDashboard />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/reports"
        element={user?.role === "admin" ? withShell(<AdminReports />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/users"
        element={user?.role === "admin" ? withShell(<AdminUsers />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/authorities"
        element={user?.role === "admin" ? withShell(<AdminAuthorities />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/audit-logs"
        element={user?.role === "admin" ? withShell(<AdminAuditLogs />) : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/alerts"
        element={user?.role === "admin" ? withShell(<AdminAlerts />) : <Navigate to="/login" replace />}
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

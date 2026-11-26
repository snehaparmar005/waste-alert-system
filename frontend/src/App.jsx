import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSession } from "./api/client";
import AppShell from "./components/AppShell";
import HomePage from "./components/HomePage";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import MyReportsTimeline from "./components/MyReportsTimeline";
import UserProfile from "./components/UserProfile";
import GovReports from "./components/gov/GovReports";
import GovWorkers from "./components/gov/GovWorkers";
import AdminUsers from "./components/admin/AdminUsers";
import AdminAuthorities from "./components/admin/AdminAuthorities";
import AdminAlerts from "./components/admin/AdminAlerts";

const GovDashboard = lazy(() => import("./components/gov/GovDashboard"));
const ReportWaste = lazy(() => import("./components/ReportWaste"));
const WorkerDashboard = lazy(() => import("./components/worker/WorkerDashboard"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const AdminReports = lazy(() => import("./components/admin/AdminReports"));
const AdminAuditLogs = lazy(() => import("./components/admin/AdminAuditLogs"));

function RouteLoading() {
  return (
    <div role="status" className="mx-auto flex min-h-48 max-w-7xl items-center justify-center gap-3 px-4 text-sm text-gray-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#159B43]" />
      Loading dashboard...
    </div>
  );
}

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

  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={handleLogout}>
        <Suspense fallback={<RouteLoading />}>
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

          <Route
            path="/report"
            element={user?.role === "citizen" ? <ReportWaste /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/my-reports"
            element={user?.role === "citizen" ? <MyReportsTimeline /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={
              user ? (
                <UserProfile onProfileUpdate={handleProfileUpdate} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/worker/dashboard"
            element={user?.role === "worker" ? <WorkerDashboard /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/gov/dashboard"
            element={user?.role === "gov" ? <GovDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/gov/reports"
            element={user?.role === "gov" ? <GovReports /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/gov/workers"
            element={user?.role === "gov" ? <GovWorkers /> : <Navigate to="/login" replace />}
          />

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
            path="/admin/audit-logs"
            element={user?.role === "admin" ? <AdminAuditLogs /> : <Navigate to="/login" replace />}
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
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

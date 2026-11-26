import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSession } from "./api/client";
import Home from "@/pages/Home.jsx";
import Report from "@/pages/Report.jsx";
import Admin from "@/pages/Admin.jsx";
import AppShell from "./components/AppShell";
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getSession } from "./api/client";

import AppShell from "./components/AppShell";
import HomePage from "./components/HomePage";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";

// Citizen
import ReportWaste from "./components/ReportWaste";
import MyReportsTimeline from "./components/MyReportsTimeline";
import UserProfile from "./components/UserProfile";

// Government
import GovDashboard from "./components/gov/GovDashboard";
import GovReports from "./components/gov/GovReports";
import GovReportDetail from "./components/gov/GovReportDetail";

// Admin
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminReports from "./components/admin/AdminReports";
import AdminUsers from "./components/admin/AdminUsers";
import AdminAuthorities from "./components/admin/AdminAuthorities";
import AdminAlerts from "./components/admin/AdminAlerts";

export default function App() {
  const [session, setSession] = useState(getSession());
  const role = session?.user?.role;

  return (
    <Router>
      <AppShell user={session?.user} onLogout={() => setSession(null)}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage user={session?.user} />} />
          <Route path="/register" element={<RegisterCard />} />
          <Route path="/login" element={<LoginCard onLoginSuccess={setSession} />} />

          {/* Citizen */}
          <Route path="/report" element={role === "citizen" ? <ReportWaste /> : <Navigate to="/login" />} />
          <Route path="/my-reports" element={role === "citizen" ? <MyReportsTimeline /> : <Navigate to="/login" />} />
          <Route path="/profile" element={role === "citizen" ? <UserProfile onProfileUpdate={(u) => setSession({ ...session, user: u })} /> : <Navigate to="/login" />} />

          {/* Government */}
          <Route path="/gov/dashboard" element={role === "gov" ? <GovDashboard /> : <Navigate to="/login" />} />
          <Route path="/gov/reports" element={role === "gov" ? <GovReports /> : <Navigate to="/login" />} />
          <Route path="/gov/report/:id" element={role === "gov" ? <GovReportDetail /> : <Navigate to="/login" />} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={role === "admin" ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/reports" element={role === "admin" ? <AdminReports /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={role === "admin" ? <AdminUsers /> : <Navigate to="/login" />} />
          <Route path="/admin/authorities" element={role === "admin" ? <AdminAuthorities /> : <Navigate to="/login" />} />
          <Route path="/admin/alerts" element={role === "admin" ? <AdminAlerts /> : <Navigate to="/login" />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

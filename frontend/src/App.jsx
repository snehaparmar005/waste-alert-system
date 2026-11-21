import { Routes, Route, Link } from "react-router-dom";
import Home from "@/pages/Home.jsx";
import Report from "@/pages/Report.jsx";
import Admin from "@/pages/Admin.jsx";

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
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/report" element={<Report />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

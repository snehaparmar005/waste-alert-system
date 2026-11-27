import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { apiRequest, saveSession } from "../api/client";

const field = "min-h-11 w-full rounded-xl border-2 border-ink bg-card px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ring";
const primaryBtn = "inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-ink bg-accent px-6 py-3 font-semibold text-ink shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-60";

export default function LoginCard({ onAuthSuccess }) {
  const [email, setEmail] = useState("citizen@test.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveSession(data);
      onAuthSuccess(data);

      const role = data?.user?.role;
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "gov" || role === "officer") navigate("/gov/dashboard");
      else if (role === "worker") navigate("/worker/dashboard");
      else navigate("/citizen/report");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <div className="page-bg min-h-screen font-sans text-body">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <Link to="/" className="flex min-h-11 items-center gap-2">
            <img src={logo} alt="Click-2-Clean logo" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-extrabold text-ink">
              Click-2-<span className="text-primary">Clean</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="dots-mint flex min-h-[calc(100vh-61px)] items-center justify-center px-4 py-10">
        <div className="card-c w-full max-w-md p-6 md:p-8">
          <div className="mb-6 text-center">
            <span className="sticker text-xs uppercase tracking-widest">Smart City Portal</span>
            <h1 className="mt-4 text-3xl font-extrabold text-ink">Sign In</h1>
            <p className="mt-1 font-hand text-xl font-semibold text-bio-ink">
              citizen, officer, worker &amp; admin
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border-2 border-hazard bg-card p-3 text-sm font-medium text-hazard-ink"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </div>

            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-body">
              Fill Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold sm:grid-cols-4">
              <button
                type="button"
                onClick={() => fillDemo("citizen@test.com")}
                className="rounded-full border-2 border-ink bg-tint px-2 py-2 text-bio-ink transition hover:bg-bio hover:text-primary-foreground"
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => fillDemo("officer@nagarnigam.gov.in")}
                className="rounded-full border-2 border-ink bg-accent/40 px-2 py-2 text-ink transition hover:bg-accent"
              >
                Nagar Nigam
              </button>
              <button
                type="button"
                onClick={() => fillDemo("worker@nagarnigam.gov.in")}
                className="rounded-full border-2 border-ink bg-nonbio/15 px-2 py-2 text-nonbio-ink transition hover:bg-nonbio hover:text-primary-foreground"
              >
                Worker
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@nagarnigam.gov.in")}
                className="rounded-full border-2 border-ink bg-card px-2 py-2 text-ink transition hover:bg-tint"
              >
                Admin
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-body">
            Need a citizen account?{" "}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

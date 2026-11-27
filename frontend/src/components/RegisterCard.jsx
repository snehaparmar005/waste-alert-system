import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { apiRequest } from "../api/client";

const field = "min-h-11 w-full rounded-xl border-2 border-ink bg-card px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ring";
const primaryBtn = "inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-ink bg-accent px-6 py-3 font-semibold text-ink shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-60";

export default function RegisterCard() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            <span className="sticker text-xs uppercase tracking-widest">Citizen Signup</span>
            <h1 className="mt-4 text-3xl font-extrabold text-ink">Create Account</h1>
            <p className="mt-1 font-hand text-xl font-semibold text-bio-ink">
              snap, sort, and track local waste
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-xl border-2 border-hazard bg-card p-3 text-sm font-medium text-hazard-ink">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="mb-1.5 block text-sm font-bold text-ink">Full Name</label>
              <input id="reg-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={field} />
            </div>
            <div>
              <label htmlFor="reg-email" className="mb-1.5 block text-sm font-bold text-ink">Email</label>
              <input id="reg-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={field} />
            </div>
            <div>
              <label htmlFor="reg-pass" className="mb-1.5 block text-sm font-bold text-ink">Password (min 6 characters)</label>
              <input id="reg-pass" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={field} />
            </div>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-body">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

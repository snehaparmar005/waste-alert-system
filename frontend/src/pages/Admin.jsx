import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { getToken, setToken, login, listReports, getStats, updateStatus, photoUrl } from "@/lib/api";

const STATUSES = [
  { v: "reported", label: "Reported", chip: "bg-accent text-ink" },
  { v: "in_progress", label: "In progress", chip: "bg-nonbio text-primary-foreground" },
  { v: "resolved", label: "Resolved", chip: "bg-bio text-primary-foreground" },
];
const CAT_LABEL = { wet: "Wet", dry: "Dry", hazardous: "Hazardous", other: "Other" };

const field = "min-h-11 rounded-xl border-2 border-ink bg-card px-3 text-ink";
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function Shell({ children, right }) {
  const { pathname } = useLocation();

  return (
    <div className="page-bg min-h-screen font-sans text-body">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <Link to="/" className="flex min-h-11 items-center gap-2">
            <img src={logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-extrabold text-ink">Click-2-<span className="text-primary">Clean</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {right}
            {pathname !== "/" && (
              <Link to="/" className="flex min-h-11 items-center gap-1 text-ink hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="dots-mint py-10"><div className="mx-auto max-w-6xl px-4">{children}</div></main>
    </div>
  );
}

function Login({ onDone }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await login(username.trim(), password);
      setToken(res.access_token);
      onDone();
    } catch (err) {
      setError(err.status === 401 ? "Wrong username or password." : err.message);
    } finally { setBusy(false); }
  };
  return (
    <Shell>
      <form onSubmit={submit} className="card-c mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-3xl font-extrabold">Admin login</h1>
        <div className="flex flex-col gap-1">
          <label htmlFor="u" className="font-bold text-ink">Username</label>
          <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="p" className="font-bold text-ink">Password</label>
          <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className={field} />
        </div>
        {error && <p role="alert" className="rounded-xl border-2 border-hazard bg-card p-3 font-medium text-hazard-ink">{error}</p>}
        <button type="submit" disabled={busy} className={`${btn} w-full border-2 border-ink bg-accent text-ink shadow-[4px_4px_0_var(--ink)] disabled:opacity-60`}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </Shell>
  );
}

function Dashboard({ onLogout }) {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const [r, s] = await Promise.all([listReports({ status, category }), getStats()]);
      setReports(r);
      setStats(s);
    } catch (err) {
      if (err.status === 401) { onLogout(); return; }
      setError(err.message);
    } finally { setLoading(false); }
  }, [status, category, onLogout]);

  useEffect(() => { load(); }, [load]);

  const change = async (id, next) => {
    setError("");
    try {
      const updated = await updateStatus(id, next);
      setReports((rs) => rs.map((x) => (x.id === id ? updated : x)));
      getStats().then(setStats).catch(() => {});
    } catch (err) {
      if (err.status === 401) { onLogout(); return; }
      setError(err.message);
    }
  };

  return (
    <Shell right={<button type="button" onClick={onLogout} className={`${btn} border-2 border-ink bg-card py-2 text-ink hover:bg-tint`}>Log out</button>}>
      <h1 className="text-3xl font-extrabold md:text-4xl">Reports</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[["Total", stats?.total], ["Reported", stats?.by_status?.reported], ["In progress", stats?.by_status?.in_progress], ["Resolved", stats?.by_status?.resolved]].map(([l, n]) => (
          <div key={l} className="card-c p-5"><p className="text-sm font-semibold text-ink">{l}</p><p className="font-display text-4xl font-extrabold text-ink">{n ?? "–"}</p></div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1"><label htmlFor="fs" className="text-sm font-bold text-ink">Status</label>
          <select id="fs" value={status} onChange={(e) => setStatus(e.target.value)} className={field}><option value="">All</option>{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label htmlFor="fc" className="text-sm font-bold text-ink">Category</label>
          <select id="fc" value={category} onChange={(e) => setCategory(e.target.value)} className={field}><option value="">All</option>{Object.entries(CAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border-2 border-hazard bg-card p-3 font-medium text-hazard-ink">{error}</p>}

      <ul className="mt-6 space-y-4">
        {loading && <li className="text-ink">Loading…</li>}
        {!loading && reports.length === 0 && <li className="card-c p-6 text-ink">No reports match these filters.</li>}
        {reports.map((r) => (
          <li key={r.id} className="card-c flex flex-wrap items-center gap-4 p-4">
            <img src={photoUrl(r.photo_url)} alt={`Report ${r.id} photo`} loading="lazy" className="h-24 w-24 shrink-0 rounded-2xl border border-ink/15 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">#{r.id} · {CAT_LABEL[r.category] ?? r.category}</p>
              {r.note && <p className="break-words text-body">{r.note}</p>}
              <p className="text-sm text-body">{new Date(r.created_at).toLocaleString()}</p>
              {r.latitude != null && r.longitude != null && (
                <a className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline" href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" />View on map</a>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`st${r.id}`} className="text-sm font-bold text-ink">Status</label>
              <select id={`st${r.id}`} value={r.status} onChange={(e) => change(r.id, e.target.value)} className={field}>
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const logout = useCallback(() => { setToken(null); setAuthed(false); }, []);
  return authed ? <Dashboard onLogout={logout} /> : <Login onDone={() => setAuthed(true)} />;
}

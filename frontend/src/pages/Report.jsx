import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, MapPin, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { submitReport } from "@/lib/api";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const CATS = [
  { v: "wet", label: "Wet", hint: "Food, kitchen, garden waste", dot: "bg-emerald-500", borderActive: "border-teal-500 bg-teal-50/70" },
  { v: "dry", label: "Dry", hint: "Plastic, paper, metal, glass", dot: "bg-sky-500", borderActive: "border-sky-500 bg-sky-50/70" },
  { v: "hazardous", label: "Hazardous", hint: "Batteries, bulbs, medicines", dot: "bg-rose-400", borderActive: "border-rose-400 bg-rose-50/70" },
  { v: "other", label: "Other / not sure", hint: "Debris, blocked drain, mixed", dot: "bg-indigo-400", borderActive: "border-indigo-400 bg-indigo-50/70" },
];

const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const primary = `${btn} border border-teal-700/20 bg-teal-700 text-white shadow-md shadow-teal-900/10 hover:bg-teal-800`;
const outline = `${btn} border border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-50`;

export default function Report() {
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return;
    if (!TYPES.includes(f.type)) { setError("Please choose a JPG, PNG or WebP photo."); return; }
    if (f.size > MAX_BYTES) { setError("That photo is over 5 MB. Please choose a smaller one."); return; }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const getLocation = () => {
    setGeoMsg("");
    if (!navigator.geolocation) { setGeoMsg("Your browser can't share location."); return; }
    setGeoMsg("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoMsg("Location attached.");
      },
      () => { setCoords(null); setGeoMsg("Couldn't get your location. You can still send the report."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!photo) { setError("Please add a photo of the waste."); return; }
    if (!category) { setError("Please choose what kind of waste it is."); return; }
    setBusy(true);
    try {
      const res = await submitReport({ photo, category, note: note.trim(), ...(coords ?? {}) });
      setDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/60 via-purple-50/40 via-rose-50/30 to-teal-50/40 font-sans text-slate-700">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex min-h-11 items-center gap-2">
            <img src={logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-extrabold text-slate-800">Click-2-<span className="text-teal-700">Clean</span></span>
          </Link>
        </div>
      </header>

      <main className="py-10">
        <div className="mx-auto max-w-2xl px-4">
          {done ? (
            <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-lg shadow-teal-900/5 backdrop-blur-md" aria-live="polite">
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
              <h1 className="mt-3 text-3xl font-extrabold text-slate-800">Report sent</h1>
              <p className="mt-2 text-slate-600">Keep this code to check the status of your report:</p>
              <p className="mt-3 inline-block rounded-2xl border border-indigo-200 bg-indigo-50/80 px-5 py-2 font-mono text-xl font-bold text-indigo-900 shadow-xs">{done.tracking_code}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" className={primary} onClick={() => { setDone(null); setPhoto(null); setPreview(""); setCategory(""); setNote(""); setCoords(null); setGeoMsg(""); }}>Report another</button>
                <Link to="/" className={outline}>Back home</Link>
              </div>
            </section>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-md md:p-8" noValidate>
              <div className="border-b border-slate-100 pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-800">
                  Citizen Reporting
                </span>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-800">Report waste</h1>
                <p className="mt-1 text-sm text-slate-500">Snap a photo, pick the type, and add your location.</p>
              </div>

              <div>
                <label htmlFor="photo" className="block text-sm font-bold text-slate-800">1. Photo</label>
                <input ref={fileRef} id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFile} className="sr-only" />
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 flex min-h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-sky-300 bg-gradient-to-br from-sky-50/60 to-purple-50/40 text-slate-700 transition hover:border-teal-400 hover:bg-sky-50">
                  {preview
                    ? <img src={preview} alt="Preview of the waste you are reporting" className="max-h-72 w-full object-cover" />
                    : <span className="flex flex-col items-center gap-2 p-6 text-slate-600"><Camera className="h-8 w-8 text-teal-600" />Tap to take or choose a photo</span>}
                </button>
              </div>

              <fieldset>
                <legend className="text-sm font-bold text-slate-800">2. Type of waste</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {CATS.map((c) => (
                    <label key={c.v} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition ${category === c.v ? c.borderActive : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <input type="radio" name="category" value={c.v} checked={category === c.v} onChange={() => setCategory(c.v)} className="mt-1 text-teal-600 focus:ring-teal-500" />
                      <span>
                        <span className="flex items-center gap-2 font-semibold text-slate-800"><span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} aria-hidden />{c.label}</span>
                        <span className="block text-xs text-slate-500">{c.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <span className="block text-sm font-bold text-slate-800">3. Location</span>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={getLocation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-gradient-to-r from-sky-50 to-teal-50 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-white"><MapPin className="h-4 w-4 text-teal-600" />Use my location</button>
                  <span className="text-sm text-slate-600" aria-live="polite">{geoMsg}</span>
                </div>
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-bold text-slate-800">4. Note <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="e.g. next to the main gate" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </div>

              {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}

              <button type="submit" disabled={busy} className={`${primary} w-full disabled:opacity-60`}>{busy ? "Sending…" : "Send report"}</button>
              <p className="text-xs text-slate-500">Click-2-Clean is a student project. It is not an official Nagar Nigam channel, so a report may not be acted on.</p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

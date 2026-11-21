import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, MapPin, CheckCircle2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { submitReport } from "@/lib/api";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const CATS = [
  { v: "wet", label: "Wet", hint: "Food, kitchen, garden waste", dot: "bg-bio" },
  { v: "dry", label: "Dry", hint: "Plastic, paper, metal, glass", dot: "bg-nonbio" },
  { v: "hazardous", label: "Hazardous", hint: "Batteries, bulbs, medicines", dot: "bg-hazard" },
  { v: "other", label: "Other / not sure", hint: "Debris, blocked drain, mixed", dot: "bg-ink" },
];

const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const primary = `${btn} border-2 border-ink bg-accent text-ink shadow-[4px_4px_0_var(--ink)]`;
const outline = `${btn} border-2 border-ink bg-card text-ink hover:bg-tint`;

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
    <div className="page-bg min-h-screen font-sans text-body">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
          <Link to="/" className="flex min-h-11 items-center gap-2">
            <img src={logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-extrabold text-ink">Click-2-<span className="text-primary">Clean</span></span>
          </Link>
          <Link to="/" className="flex min-h-11 items-center gap-1 text-ink hover:text-primary"><ArrowLeft className="h-4 w-4" />Home</Link>
        </div>
      </header>

      <main className="dots-mint py-10">
        <div className="mx-auto max-w-2xl px-4">
          {done ? (
            <section className="card-c p-8 text-center" aria-live="polite">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h1 className="mt-3 text-3xl font-extrabold">Report sent</h1>
              <p className="mt-2 text-ink">Keep this code to check the status of your report:</p>
              <p className="mt-3 inline-block rounded-xl border-2 border-ink bg-accent px-4 py-2 font-mono text-xl font-bold text-ink">{done.tracking_code}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" className={primary} onClick={() => { setDone(null); setPhoto(null); setPreview(""); setCategory(""); setNote(""); setCoords(null); setGeoMsg(""); }}>Report another</button>
                <Link to="/" className={outline}>Back home</Link>
              </div>
            </section>
          ) : (
            <form onSubmit={onSubmit} className="card-c space-y-6 p-6 md:p-8" noValidate>
              <div>
                <h1 className="text-3xl font-extrabold">Report waste</h1>
                <p className="mt-1 text-ink">Snap a photo, pick the type, and add your location.</p>
              </div>

              <div>
                <label htmlFor="photo" className="block font-bold text-ink">1. Photo</label>
                <input ref={fileRef} id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFile} className="sr-only" />
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 flex min-h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink bg-tint text-ink hover:bg-card">
                  {preview
                    ? <img src={preview} alt="Preview of the waste you are reporting" className="max-h-72 w-full object-cover" />
                    : <span className="flex flex-col items-center gap-2 p-6"><Camera className="h-8 w-8" />Tap to take or choose a photo</span>}
                </button>
              </div>

              <fieldset>
                <legend className="font-bold text-ink">2. Type of waste</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {CATS.map((c) => (
                    <label key={c.v} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 ${category === c.v ? "border-ink bg-accent/40" : "border-border bg-card"}`}>
                      <input type="radio" name="category" value={c.v} checked={category === c.v} onChange={() => setCategory(c.v)} className="mt-1" />
                      <span>
                        <span className="flex items-center gap-2 font-semibold text-ink"><span className={`h-3 w-3 rounded-full ${c.dot}`} aria-hidden />{c.label}</span>
                        <span className="block text-sm text-body">{c.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <span className="block font-bold text-ink">3. Location</span>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={getLocation} className={outline}><MapPin className="h-4 w-4" />Use my location</button>
                  <span className="text-sm text-ink" aria-live="polite">{geoMsg}</span>
                </div>
              </div>

              <div>
                <label htmlFor="note" className="block font-bold text-ink">4. Note <span className="font-normal text-body">(optional)</span></label>
                <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="e.g. next to the main gate" className="mt-2 w-full rounded-2xl border-2 border-ink bg-card p-3 text-ink" />
              </div>

              {error && <p role="alert" className="rounded-xl border-2 border-hazard bg-card p-3 font-medium text-hazard-ink">{error}</p>}

              <button type="submit" disabled={busy} className={`${primary} w-full disabled:opacity-60`}>{busy ? "Sending…" : "Send report"}</button>
              <p className="text-sm text-body">Click-2-Clean is a student project. It is not an official Nagar Nigam channel, so a report may not be acted on.</p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

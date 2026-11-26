import { lazy, useRef, useState } from "react";
import { Leaf, Recycle, AlertTriangle, Star, RotateCcw, Share2, Volume2, VolumeX } from "lucide-react";
import { CanvasSlot } from "@/components/three/CanvasSlot";
import { sortFx } from "@/components/three/binsState";
import { bins as BINS, wasteItems } from "@/content/landing";
const SortScene = lazy(() => import("@/components/three/SortScene"));
const binIcon = [Leaf, Recycle, AlertTriangle];
const binBg = ["bg-bio", "bg-nonbio", "bg-hazard"];
const ROUND = 5;
const playable = wasteItems.map((it, i) => i).filter((i) => wasteItems[i].img);
const pick = () => [...playable].sort(() => Math.random() - 0.5).slice(0, ROUND);
let ctx = null;
function beep(ok) {
  ctx ??= new AudioContext();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = ok ? 660 : 200;
  o.type = ok ? "triangle" : "sawtooth";
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.25);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.25);
}
function SortGame() {
  const [round, setRound] = useState(() => playable.slice(0, ROUND));
  const [left, setLeft] = useState(round);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0), [streak, setStreak] = useState(0), [miss, setMiss] = useState(0);
  const [msg, setMsg] = useState(null);
  const [fx, setFx] = useState(null);
  const [sound, setSound] = useState(false);
  const [drag, setDrag] = useState(null);
  const start = useRef(null);
  const done = left.length === 0;
  function drop(item, bin) {
    const it = wasteItems[item], ok = it.bin === bin;
    if (sound) beep(ok);
    setFx({ bin, ok, n: Date.now() });
    if (ok) {
      sortFx.hit(bin);
      setLeft((l) => l.filter((x) => x !== item));
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      setMsg({ ok: true, t: `Correct: ${BINS[bin].bin}` });
    } else {
      sortFx.miss(bin);
      setStreak(0);
      setMiss((m) => m + 1);
      setMsg({ ok: false, t: `Not quite. ${it.hint}` });
    }
    setSel(null);
  }
  function again() {
    const r = pick();
    setRound(r);
    setLeft(r);
    setScore(0);
    setStreak(0);
    setMiss(0);
    setMsg(null);
  }
  const stars = miss === 0 ? 3 : miss <= 2 ? 2 : 1;
  async function share() {
    const text = `I sorted ${ROUND} waste items with ${stars}/3 stars on Click-2-Clean!`;
    try {
      if (navigator.share) await navigator.share({ text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        setMsg({ ok: true, t: "Score copied to clipboard" });
      }
    } catch {
    }
  }
  const onDown = (i) => (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture?.(e.pointerId);
    setDrag({ i, x: 0, y: 0 });
  };
  const onMove = (e) => {
    if (drag && start.current) setDrag({ ...drag, x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const onUp = (e) => {
    if (!drag) return;
    const moved = Math.hypot(drag.x, drag.y) > 10;
    if (moved) {
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const z = els.find((el) => el.dataset?.["bin"] !== void 0);
      if (z) drop(drag.i, Number(z.dataset["bin"]));
    } else setSel((s) => s === drag.i ? null : drag.i);
    setDrag(null);
    start.current = null;
  };
  return <div>
      <div className="relative">
        <CanvasSlot Scene={SortScene} className="h-36 md:h-46" fallback={<div className="h-4" />} />
        <div className="absolute inset-x-0 top-0 h-36 md:left-1/2 md:h-46 md:w-[480px] md:-translate-x-1/2 grid grid-cols-3" aria-hidden>{[0, 1, 2].map((i) => <div key={i} data-bin={i} onClick={() => sel !== null && drop(sel, i)} />)}</div>
        <div className="mx-auto grid grid-cols-3 gap-1 md:w-[480px]">
          {BINS.map((b, i) => {
    const I = binIcon[i];
    const anim = fx?.bin === i ? fx.ok ? "anim-wiggle" : "anim-shake" : "";
    return <button
      key={b.k}
      data-bin={i}
      onClick={() => sel !== null && drop(sel, i)}
      aria-label={`${b.label} waste, ${b.bin}${sel !== null ? `: put ${wasteItems[sel].name} here` : ""}`}
      className={`min-h-[52px] rounded-2xl border-2 border-dashed px-2 py-3 transition ${sel !== null || drag ? "border-ink bg-card" : "border-transparent"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
              <span key={fx?.n} className={`inline-flex items-center gap-1.5 rounded-full ${binBg[i]} px-2.5 py-1.5 text-xs font-bold text-primary-foreground sm:px-3 sm:text-sm ${anim}`}><I className="h-4 w-4" aria-hidden />{b.label}</span>
              <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-wide text-body sm:text-xs">{b.bin}</span>
            </button>;
  })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-xl font-bold text-ink">Sort {ROUND} items</p>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="rounded-full bg-card px-3 py-2 card-c">Score {score}/{ROUND}</span>
          <span className="rounded-full bg-accent px-3 py-2">Streak {streak}</span>
          <button onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? "Mute sound" : "Turn sound on"} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring">{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
        </div>
      </div>
      <p aria-live="polite" className={`rounded-2xl text-base font-semibold ${msg ? "mt-3 min-h-[44px] px-4 py-2.5 " + (msg.ok ? "bg-tint text-bio-ink" : "bg-card text-hazard-ink card-c") : ""}`}>{msg?.t ?? ""}</p>

      {done ? <div className="card-c mt-4 p-6 text-center">
          <div className="flex justify-center gap-1" aria-label={`${stars} out of 3 stars`}>{[0, 1, 2].map((s) => <Star key={s} className={`h-9 w-9 ${s < stars ? "fill-accent text-ink" : "text-border"}`} aria-hidden />)}</div>
          <p className="mt-2 text-lg font-semibold text-ink">All sorted! {miss} wrong {miss === 1 ? "try" : "tries"}.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button onClick={again} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover"><RotateCcw className="h-4 w-4" />Play again</button>
            <button onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink px-5 font-semibold text-ink"><Share2 className="h-4 w-4" />Share my score</button>
          </div>
        </div> : <>
          <p className="mt-1 text-sm text-body">Drag a card onto a bin, or tap a card then tap a bin.</p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {round.filter((i) => left.includes(i)).map((i) => {
    const it = wasteItems[i];
    const d = drag?.i === i ? drag : null;
    return <li key={i}>
                <button
      onPointerDown={onDown(i)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSel(sel === i ? null : i);
        }
      }}
      aria-pressed={sel === i}
      aria-label={`${it.name}. Select, then choose a bin.`}
      style={d ? { transform: `translate(${d.x}px, ${d.y}px) rotate(4deg)`, zIndex: 30, position: "relative" } : void 0}
      className={`w-full touch-none select-none rounded-[20px] border-2 border-ink bg-card p-3 text-left shadow-soft transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sel === i ? "ring-2 ring-primary" : ""} ${d ? "cursor-grabbing shadow-xl" : "cursor-grab lift"}`}
    >
                  <img src={it.img} alt={it.name} loading="lazy" className="pointer-events-none h-36 w-full rounded-xl object-contain" />
                  <span className="mt-2 block font-semibold text-ink">{it.name}</span>
                </button>
              </li>;
  })}
          </ul>
        </>}
    </div>;
}
export {
  SortGame
};

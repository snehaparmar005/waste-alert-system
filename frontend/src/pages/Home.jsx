import { Link } from "react-router-dom";
import { lazy, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, startSmoothScroll, scrollToHash, getLenis, prefersReducedMotion, hero as heroState } from "@/lib/motion";
import { CanvasSlot } from "@/components/three/CanvasSlot";
import { SortGame } from "@/components/landing/SortGame";
import { SpotCard } from "@/components/landing/SpotCard";
import { Dashboard } from "@/components/landing/Dashboard";
import { Phone } from "@/components/landing/Phone";
import { BottleDoodle } from "@/components/landing/Doodles";
import { Camera, Cpu, MapPin, BellRing, Menu, X, Leaf, Recycle, AlertTriangle, Map, ListChecks, BarChart3, CheckCircle2, ArrowRight, ShieldCheck, Users, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logo from "@/assets/logo.png";
import * as C from "@/content/landing";
const HeroScene = lazy(() => import("@/components/three/HeroScene"));
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const primary = `${btn} bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover`;
const outline = `${btn} border-2 border-ink bg-card text-ink hover:bg-tint`;
function Reveal({ children, className }) {
  return <div className={`reveal ${className ?? ""}`}>{children}</div>;
}
function Heading({ eyebrow, title, note, className }) {
  return <Reveal className={`mx-auto max-w-2xl text-center ${className ?? "mb-12"}`}>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-4xl font-extrabold md:text-5xl">{title}</h2>
      {note && <p className="mt-2 inline-block -rotate-3 font-hand text-2xl font-semibold text-bio-ink" aria-hidden>{note}</p>}
    </Reveal>;
}
function Logo() {
  return (
    <a href="#top" data-nav className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <img src={logo} alt="Click-2-Clean logo" width={36} height={36} className="h-9 w-9 object-contain" />
      <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
        Click-2-<span className="text-[#159B43]">Clean</span>
      </span>
      <span className="hidden h-5 w-px bg-border sm:inline-block" />
      <span className="hidden items-center gap-1 font-display text-sm font-semibold italic text-[#159B43] sm:inline-flex">
        A Cleaner City, A Healthier You <Leaf className="h-4 w-4 text-[#159B43]" />
      </span>
    </a>
  );
}
const catStyle = { bio: { c: "text-bio-ink", b: "bg-bio", I: Leaf, l: "Wet" }, nonbio: { c: "text-nonbio-ink", b: "bg-nonbio", I: Recycle, l: "Dry" }, hazard: { c: "text-hazard-ink", b: "bg-hazard", I: AlertTriangle, l: "Hazardous" } };
const stepIcons = [Camera, Cpu, MapPin, BellRing];
const featIcons = [Cpu, MapPin, BellRing, Map, ListChecks, BarChart3];
const featChip = ["bg-tint text-bio-ink", "bg-nonbio text-primary-foreground", "bg-accent text-ink", "bg-primary text-primary-foreground", "bg-tint text-nonbio-ink", "bg-hazard text-primary-foreground"];
const faqChips = [
  { b: "bg-bio text-card", I: Leaf },
  { b: "bg-nonbio text-card", I: Recycle },
  { b: "bg-bio text-card", I: MapPin },
  { b: "bg-accent text-ink", I: BellRing },
  { b: "bg-tint text-bio-ink", I: CheckCircle2 }
];
const featSpan = ["lg:col-span-2", "", "", "", "", "lg:col-span-2"];
function Index() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const root = useRef(null);
  useMotion(root, setStep);
  useEffect(() => {
    const l = getLenis();
    if (open) l?.stop();
    else l?.start();
  }, [open]);
  return <div id="top" ref={root} className="page-bg min-h-screen overflow-x-clip font-sans text-body">
      <div className="progress fixed left-0 top-0 z-[60] h-1 w-full origin-left scale-x-0 bg-primary" aria-hidden />
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2" aria-label="Main">
          <Logo />
          <ul className="hidden gap-1 lg:flex">
            {C.nav.map((n) => <li key={n.href}><a data-nav href={n.href} className="flex min-h-11 items-center rounded-full px-3 text-base font-medium text-ink hover:bg-tint">{n.label}</a></li>)}
          </ul>
          <div className="hidden items-center gap-2 lg:flex">
            <Link to="/register" className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-ink bg-card px-4 py-1.5 text-sm font-bold text-ink transition hover:bg-tint">
              Register
            </Link>
            <Link to="/login" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-[#159B43] bg-[#159B43] px-5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#118037]">
              Portal Login
            </Link>
            <Link to={C.links.admin} className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-ink bg-card px-4 py-1.5 text-sm font-bold text-ink transition hover:bg-tint">
              Admin Login
            </Link>
            <Link to={C.links.report} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-accent px-5 py-1.5 text-sm font-bold text-ink shadow-[3px_3px_0_var(--ink)] transition hover:bg-accent/90">
              <Camera className="h-4 w-4" />
              Report Waste
            </Link>
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-lg text-ink lg:hidden focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </nav>
        {open && <div className="border-t border-border bg-background px-4 pb-4 lg:hidden">
            {C.nav.map((n) => <a data-nav key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-3 font-medium text-ink">{n.label}</a>)}
            <div className="mt-3 grid gap-2">
              <Link to={C.links.report} className={`${primary} py-2.5`}>Report Waste</Link>
              <Link to="/login" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#159B43] px-6 py-2.5 font-bold text-white">Portal Login</Link>
              <Link to="/register" className={`${outline} py-2.5`}>Register</Link>
              <Link to={C.links.admin} className={`${outline} py-2.5`}>Admin Login</Link>
            </div>
          </div>}
      </header>

      <main>
        {
          /* 1 HERO - FULL-WIDTH UNIFIED CITY BACKGROUND WITH SUBTLE OVERLAY */
        }
        <section className="relative min-h-[85vh] w-full overflow-hidden bg-emerald-950 py-16 md:py-24 flex items-center">
          {/* Full-width realistic city background with hand scanning garbage, bin & greenery */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/hero-reference.jpg"
              alt="Realistic city street with greenery, recycling bin, trash bags and smartphone scanning garbage"
              className="h-full w-full object-cover object-[75%_center] md:object-right"
              loading="eager"
            />
            {/* Subtle natural white-to-green gradient overlay ensuring high contrast readability on left while revealing background on right */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/30 md:from-white/95 md:via-white/75 md:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-white/30 md:hidden" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl lg:max-w-3xl">
              
              {/* Academic Project Badge / Subtitle */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-white/95 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-[#159B43] animate-pulse" />
                <p className="text-xs font-semibold tracking-wide text-emerald-900 md:text-[13px]">
                  Development of Garbage Classification, Location Tracking and Alert Generation System
                </p>
              </div>

              {/* Main and Largest Heading */}
              <h1 className="mt-5 font-display text-4xl font-black tracking-tight text-[#0B4650] sm:text-5xl md:text-6xl lg:text-[4.5rem] lg:leading-[1.06]">
                Click to <span className="text-[#159B43]">Clean</span>
              </h1>

              {/* Reference Subheading */}
              <h2 className="mt-4 font-display text-2xl font-extrabold leading-snug text-[#172B27] sm:text-3xl md:text-4xl">
                Spot Waste. <br className="hidden sm:inline" />
                Snap a Photo. <br className="hidden sm:inline" />
                <span className="relative inline-block text-[#159B43]">
                  Keep Your City Clean.
                  <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-[#159B43]/30" />
                </span>
              </h2>

              {/* AI-powered waste management description */}
              <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-[#234d45] md:text-lg">
                An AI-powered waste alert system for a greener and cleaner community. Automatically classify waste, track garbage spot locations via GPS, and send instant alerts to municipal teams.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={C.links.report}
                  className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#159B43] px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-emerald-700/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#118037] hover:shadow-2xl hover:shadow-emerald-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B43] focus-visible:ring-offset-2"
                >
                  <Camera className="h-5 w-5" />
                  <span>Report Waste</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-emerald-900/30 bg-white/90 px-6 py-3 text-base font-bold text-[#0B4650] shadow-md backdrop-blur-md transition-all hover:bg-emerald-50 hover:text-[#159B43]"
                >
                  <span>Citizen &amp; Staff Login</span>
                </Link>
              </div>

              {/* Bottom Value Props Bar */}
              <div className="mt-10 w-full max-w-2xl rounded-2xl border border-emerald-200/90 bg-white/90 p-3 shadow-lg backdrop-blur-md sm:p-4">
                <div className="grid grid-cols-1 divide-y divide-emerald-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="flex items-center gap-3 py-2 sm:px-3 sm:py-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#159B43]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="leading-tight">
                      <span className="block text-xs font-bold text-emerald-950">Cleaner</span>
                      <span className="text-xs font-semibold text-emerald-700">Environment</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-2 sm:px-3 sm:py-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#159B43]">
                      <Leaf className="h-5 w-5" />
                    </div>
                    <div className="leading-tight">
                      <span className="block text-xs font-bold text-emerald-950">Greener</span>
                      <span className="text-xs font-semibold text-emerald-700">Tomorrow</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-2 sm:px-3 sm:py-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#159B43]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="leading-tight">
                      <span className="block text-xs font-bold text-emerald-950">A Healthier</span>
                      <span className="text-xs font-semibold text-emerald-700">Community</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {
    /* 2 KNOW YOUR WASTE */
  }
        <section id="categories" className="dots-mint scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <Heading eyebrow="Waste categories" title="Know your waste" note="drag it, drop it, ace it" className="mb-2" />
            <Reveal><SortGame /></Reveal>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {C.categories.map((c, ci) => {
    const s = catStyle[c.k];
    return <Reveal key={c.t}>
                  <article className="card-c lift h-full overflow-hidden">
                    <div className="flex items-center gap-4 p-5">
                      <img src={C.categoryThumbs[ci]} alt={c.items[0]} loading="lazy" className="h-24 w-24 shrink-0 rounded-2xl border border-ink/15 bg-card object-contain" />
                      <div>
                        <span className={`inline-flex items-center gap-1 rounded-full ${s.b} px-2.5 py-1 text-xs font-bold text-primary-foreground`}><s.I className="h-3.5 w-3.5" aria-hidden />{s.l}</span>
                        <h3 className={`mt-1 text-xl font-bold ${s.c}`}>{c.t}</h3>
                      </div>
                    </div>
                    <div className="px-5 pb-5">
                      <ul className="flex flex-wrap gap-2">{c.items.map((x) => <li key={x} className="rounded-full bg-tint px-3 py-1 text-sm text-ink">{x}</li>)}</ul>
                      <p className="mt-3 text-base text-ink">{c.tip}</p>
                    </div>
                  </article>
                </Reveal>;
  })}
            </div>
          </div>
        </section>

        {
    /* 3 HOW IT WORKS */
  }
        <section id="how" className="story relative scroll-mt-20 bg-tint" style={{ height: "320vh" }}>
          <div className="sticky top-16 flex min-h-[calc(100vh-4rem)] items-center py-8">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 md:grid-cols-2 md:gap-10">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-primary">How it works</p>
                <h2 className="mt-1 text-3xl font-extrabold md:text-5xl">Four simple steps</h2>
                <ol className="mt-4 space-y-2 md:mt-8 md:space-y-3">
                  {C.steps.map((s, i) => {
    const I = stepIcons[i];
    const on = i === step;
    return <li key={s.t} aria-current={on ? "step" : void 0} className={`flex items-center gap-3 rounded-3xl p-2 transition md:p-3 ${on ? "bg-card shadow-soft" : "opacity-80"}`}>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl md:h-14 md:w-14 ${on ? "bg-primary text-primary-foreground" : "bg-card text-primary"}`}><I className="h-5 w-5" /></div>
                      <div><h3 className="text-base font-bold md:text-xl">{i + 1}. {s.t}</h3><p className={`text-sm text-ink md:text-base ${on ? "" : "hidden md:block"}`}>{s.d}</p></div>
                    </li>;
  })}
                </ol>
              </div>
              <div className="hidden md:block"><Phone step={step} /></div>
            </div>
          </div>
        </section>

        {
    /* 4 FEATURES */
  }
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <Heading eyebrow="Features" title="Everything needed to keep streets clean" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {C.features.map((f, i) => {
    const I = featIcons[i];
    return <Reveal key={f.t} className={featSpan[i]}>
                <div className="card-c lift h-full p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featChip[i]}`}><I className="h-7 w-7" /></div>
                  <h3 className="mt-4 text-xl font-bold">{f.t}</h3>
                  <p className="mt-1 text-base text-body">{f.d}</p>
                </div>
              </Reveal>;
  })}
          </div>
        </section>

        {
    /* 5 SAMPLE SPOTS */
  }
        <section className="bg-tint py-20">
          <div className="mx-auto max-w-6xl px-4">
            <Heading eyebrow="Sample spots" title="Reported vs Cleaned" />
            <div className="grid items-start gap-6 md:grid-cols-3">{C.spots.map((s) => <Reveal key={s.t}><SpotCard {...s} /></Reveal>)}</div>
            <p className="mt-4 text-center text-sm font-medium text-ink">Sample photos</p>
          </div>
        </section>

        {
    /* 6 NIGAM */
  }
        <section id="nigam" className="scroll-mt-20 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-5">
            <Reveal className="lg:col-span-2">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">For Nagar Nigam</p>
              <h2 className="mt-2 text-4xl font-extrabold md:text-5xl">One dashboard for every complaint</h2>
              <ul className="mt-6 space-y-3">{C.nigam.map((n) => <li key={n} className="flex items-center gap-3 text-ink"><CheckCircle2 className="h-6 w-6 text-primary" />{n}</li>)}</ul>
            </Reveal>
            <Reveal className="lg:col-span-3 [perspective:1200px]"><Dashboard /></Reveal>
          </div>
        </section>

        <section className="bg-tint py-20">
          <Reveal className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-4xl font-extrabold md:text-5xl">Why it matters</h2>
            <p className="mt-4 text-lg text-ink">{C.why.text}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">{C.why.badges.map((b, i) => <span key={b} className={`sticker text-sm ${i ? "rotate-2" : "-rotate-2"}`}>{b}</span>)}</div>
          </Reveal>
        </section>

        {
    /* 7 FAQ */
  }
        <section id="faq" className="dots-mint relative scroll-mt-20 overflow-hidden py-20">
          <Leaf className="pointer-events-none absolute left-5 top-24 hidden h-10 w-10 -rotate-12 text-bio lg:block lg:h-14 lg:w-14" />
          <BottleDoodle className="pointer-events-none absolute bottom-32 right-6 hidden h-16 w-16 rotate-12 text-nonbio lg:block" />
          <Recycle className="pointer-events-none absolute bottom-24 left-8 hidden h-12 w-12 rotate-6 text-primary lg:block" />
          <div className="relative mx-auto max-w-3xl px-4">
            <div className="relative md:pt-28">
              <div className="mb-4 flex justify-center md:mb-0">
                <span className="sticker -rotate-3 text-sm md:absolute md:right-2 md:top-16">{C.faqDecor.sticker}</span>
              </div>
              <Heading eyebrow="FAQ" title="Questions, answered" />
            </div>
            <Accordion type="single" collapsible defaultValue="q0" className="space-y-4">
              {C.faq.map((f, i) => {
    const chip = faqChips[i % faqChips.length];
    const Ico = chip.I;
    return <AccordionItem key={f.q} value={`q${i}`} className="overflow-hidden rounded-[20px] border-2 border-ink bg-card shadow-[5px_5px_0_var(--ink)]">
                    <AccordionTrigger className="min-h-11 items-center gap-3 px-5 py-4 text-left text-lg font-semibold text-ink hover:no-underline">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink ${chip.b}`} aria-hidden><Ico className="h-4 w-4" /></span>
                      <span className="flex-1 text-left">{f.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 text-base text-body-deep">{f.a}</AccordionContent>
                  </AccordionItem>;
  })}
            </Accordion>
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <p className="font-semibold text-ink">{C.faqDecor.still}</p>
              <Link to={C.links.report} className={`${btn} border-2 border-ink bg-accent text-ink shadow-[4px_4px_0_var(--ink)] hover:bg-accent/90`}><Camera className="h-5 w-5" />Report Waste</Link>
            </div>
          </div>
        </section>

        {
    /* 8 CTA */
  }
        <section className="bg-tint py-20">
          <Reveal className="mx-auto max-w-3xl px-4 text-center">
            <span className="sticker -rotate-3 text-sm">{C.stickers[0]}</span>
            <h2 className="mt-4 text-4xl font-extrabold md:text-6xl">Spotted garbage? Click it, clean it.</h2>
            <p className="mt-3 text-lg text-ink">Your one photo can get a street cleaned.</p>
            <Link to={C.links.report} className={`${primary} mt-8 px-10 py-4 text-xl`}><Camera className="h-6 w-6" />Report Waste</Link>
            <p className="mt-3 text-sm text-ink">{C.reportIncludes}</p>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border bg-secondary pb-28 pt-12 lg:pb-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          <div><Logo /><p className="mt-2 text-ink">Snap. Sort. Alert.</p>
            <div className="mt-3 flex flex-wrap gap-2">{C.why.badges.map((b) => <span key={b} className="rounded-full border border-ink/30 bg-card px-3 py-1 text-xs font-semibold text-ink">{b}</span>)}</div></div>
          <ul className="grid grid-cols-2 gap-1">{C.nav.map((n) => <li key={n.href}><a data-nav href={n.href} className="flex min-h-11 items-center text-ink hover:text-primary">{n.label}</a></li>)}</ul>
          <div className="text-ink"><p className="font-bold">Project credits</p><p className="mt-1">{C.credits.mentor}</p><p>{C.credits.team}</p></div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl px-4 text-sm text-ink">{C.credits.note}</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <Link to={C.links.report} className={`${primary} w-full`}><Camera className="h-5 w-5" />Report Waste</Link>
      </div>
    </div>;
}
function useMotion(root, setStep) {
  useEffect(() => startSmoothScroll(), []);
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest("a[data-nav]");
      const h = a?.getAttribute("href");
      if (!h?.startsWith("#")) return;
      e.preventDefault();
      scrollToHash(h);
    };
    document.addEventListener("click", onClick);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("load", refresh);
    };
  }, []);
  useGSAP(() => {
    const reduced = prefersReducedMotion();
    const q = gsap.utils.selector(root);
    if (!reduced) gsap.from(q(".hero-title .word"), { yPercent: 110, stagger: 0.08, duration: 0.7, ease: "power3.out", delay: 0.1 });
    gsap.to(q(".progress"), { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    gsap.set(q(".reveal"), { opacity: 0 });
    ScrollTrigger.batch(q(".reveal"), {
      once: true,
      start: "top 90%",
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: reduced ? 0 : 28 }, { opacity: 1, y: 0, stagger: 0.08, duration: reduced ? 0.3 : 0.7, ease: "power3.out" })
    });
    ScrollTrigger.create({ trigger: q(".story"), start: "top top", end: "bottom bottom", onUpdate: (s) => setStep(Math.min(3, Math.floor(s.progress * 4))) });
    const heroSec = q("main section")[0];
    ScrollTrigger.create({ trigger: heroSec, start: "top top", end: "bottom top", scrub: true, onUpdate: (st) => {
      heroState.p = st.progress;
    } });
    if (reduced) return;
    const mm = gsap.matchMedia();
    mm.add("(hover: hover) and (min-width: 768px)", () => {
      const offs = [];
      q(".magnetic").forEach((b) => {
        const xTo = gsap.quickTo(b, "x", { duration: 0.4 }), yTo = gsap.quickTo(b, "y", { duration: 0.4 });
        const mv = (e) => {
          const r = b.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.25);
          yTo((e.clientY - r.top - r.height / 2) * 0.25);
        };
        const lv = () => {
          xTo(0);
          yTo(0);
        };
        b.addEventListener("pointermove", mv);
        b.addEventListener("pointerleave", lv);
        offs.push(() => {
          b.removeEventListener("pointermove", mv);
          b.removeEventListener("pointerleave", lv);
        });
      });
      return () => offs.forEach((f) => f());
    });
    gsap.to(q(".hotspot"), { scale: 1.2, repeat: -1, yoyo: true, duration: 0.8, stagger: 0.25 });
  }, { scope: root });
}
export default Index;

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);
const NAV_OFFSET = -72;
let lenis = null;
const getLenis = () => lenis;
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function canUse3D() {
  if (typeof window === "undefined" || prefersReducedMotion()) return false;
  const small = window.innerWidth < 768;
  const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
  const mem = navigator.deviceMemory ?? 8;
  const conn = navigator.connection;
  if (small && lowPower || mem <= 2 || conn?.saveData || /2g/.test(conn?.effectiveType ?? "")) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
function startSmoothScroll() {
  if (prefersReducedMotion()) return () => {
  };
  lenis = new Lenis({ duration: 1.1 });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (t) => lenis?.raf(t * 1e3);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}
function scrollToHash(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: NAV_OFFSET });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
const isLite = () => typeof window !== "undefined" && (window.innerWidth < 768 || (navigator.deviceMemory ?? 8) <= 4);
const hero = { p: 0, pulse: 0 };
export {
  NAV_OFFSET,
  ScrollTrigger,
  canUse3D,
  getLenis,
  gsap,
  hero,
  isLite,
  prefersReducedMotion,
  scrollToHash,
  startSmoothScroll
};

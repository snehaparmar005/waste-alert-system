import { Component, Suspense, useEffect, useRef, useState } from "react";
import { canUse3D } from "@/lib/motion";
class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}
function CanvasSlot({ Scene, fallback, className }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(null);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    setOk(canUse3D());
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setNear(true);
      setActive(e.isIntersecting);
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className} aria-hidden="true">
      {ok === false || ok === null ? fallback : near ? <Boundary fallback={fallback}><Suspense fallback={fallback}><Scene active={active} /></Suspense></Boundary> : fallback}
    </div>;
}
export {
  CanvasSlot
};

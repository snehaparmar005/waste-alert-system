import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Rig, WheelieBin, Banana, Bottle, Battery, COL } from "./common";
import { bins } from "@/content/landing";
import { sortFx } from "./binsState";
const C = [COL.bio, COL.nonbio, COL.hazard];
const Items = [Banana, Bottle, Battery];
function layout(w) {
  return w < 640 ? { scale: 1.19, spread: 1.94, y: -0.47 } : { scale: 1.5, spread: 2.25, y: -0.25 };
}
function Bin({ i, x, y, s }) {
  const g = useRef(null), lid = useRef(null);
  useFrame((st, d) => {
    const dt = Math.min(d, 0.05), b = sortFx.bins[i];
    if (!g.current || !lid.current) return;
    b.open = Math.max(0, b.open - dt);
    b.shake = Math.max(0, b.shake - dt * 2);
    const wig = sortFx.fly?.bin === i ? 0 : b.open > 0 && b.open < 0.8 ? Math.sin(b.open * 30) * 0.12 * b.open : 0;
    lid.current.rotation.x += ((b.open > 0.3 ? -1.8 : 0) - lid.current.rotation.x) * (1 - Math.exp(-12 * dt));
    g.current.rotation.z = wig;
    g.current.position.x = x + Math.sin(b.shake * 40) * 0.08 * b.shake;
    g.current.rotation.y = st.pointer.x * 0.2;
  });
  return <group ref={g} position={[x, y, 0]} scale={s}><WheelieBin color={C[i]} lidRef={lid} label={bins[i].label} labelColor={C[i]} /></group>;
}
function Flyer({ xs }) {
  const refs = useRef([]);
  useFrame((_, d) => {
    const f = sortFx.fly;
    refs.current.forEach((r2, i) => {
      if (r2) r2.visible = !!f && f.bin === i;
    });
    if (!f) return;
    f.t += Math.min(d, 0.05) * 1.5;
    const r = refs.current[f.bin], p = Math.min(f.t, 1);
    if (r) {
      r.position.set(xs[f.bin] * p, 1.9 * (1 - p) + Math.sin(p * Math.PI) * 0.8, 2 * (1 - p));
      r.rotation.set(p * 6, p * 4, 0);
    }
    if (f.t >= 1) sortFx.fly = null;
  });
  return <>{Items.map((I, i) => <group key={i} ref={(el) => {
    refs.current[i] = el;
  }} visible={false} scale={1.6}><I /></group>)}</>;
}
function Scene() {
  const { size } = useThree();
  const { scale, spread, y } = layout(size.width);
  const xs = [-spread, 0, spread];
  return <>
      {[0, 1, 2].map((i) => <Bin key={i} i={i} x={xs[i]} y={y} s={scale} />)}
      <Flyer xs={xs} />
    </>;
}
function SortScene({ active }) {
  return <Canvas frameloop={active ? "always" : "never"} dpr={[1, 1.5]} camera={{ position: [0, 0.5, 4.15], fov: 38 }} gl={{ alpha: true }}>
      <Rig /><Scene />
    </Canvas>;
}
export {
  SortScene as default
};

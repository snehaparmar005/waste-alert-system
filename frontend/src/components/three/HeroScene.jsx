import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { Rig, Pin, Bottle, Box, Battery, Banana, WheelieBin, COL } from "./common";
import { bins } from "@/content/landing";
import { hero } from "@/lib/motion";
const BIN_X = [-1.5, 0, 1.5];
const BIN_C = [COL.bio, COL.nonbio, COL.hazard];
const drops = [{ I: Banana, b: 0 }, { I: Bottle, b: 1 }, { I: Battery, b: 2 }, { I: Box, b: 1 }];
const CYCLE = 2.2;
function World() {
  const g = useRef(null);
  const lids = [useRef(null), useRef(null), useRef(null)];
  const items = useRef([]);
  useFrame((s, d) => {
    const dt = Math.min(d, 0.05), t = s.clock.elapsedTime;
    if (!g.current) return;
    const k = 1 - Math.exp(-4 * dt);
    g.current.rotation.y += (s.pointer.x * 0.3 - g.current.rotation.y) * k;
    g.current.rotation.x += (-s.pointer.y * 0.12 - g.current.rotation.x) * k;
    g.current.position.y = -hero.p * 1.2;
    const idx = Math.floor(t / CYCLE) % drops.length, ph = t % CYCLE / CYCLE;
    const target = drops[idx].b;
    lids.forEach((l, i) => {
      const open = i === target && ph > 0.25 && ph < 0.85 ? -1.7 : 0;
      if (l.current) l.current.rotation.x += (open - l.current.rotation.x) * (1 - Math.exp(-10 * dt));
    });
    items.current.forEach((it, i) => {
      if (!it) return;
      it.visible = i === idx && ph < 0.8;
      if (i !== idx) return;
      const p = Math.min(ph / 0.75, 1);
      it.position.set(THREE.MathUtils.lerp(0, BIN_X[target], p), 1.1 + Math.sin(p * Math.PI) * 0.6 - p * 1.3, 0.1);
      it.rotation.set(t * 2, t * 1.5, 0);
    });
  });
  return <group ref={g}>
      <Float speed={2} floatIntensity={0.5} rotationIntensity={0.15}>
        <group position={[0, 1.75, -0.6]}><Pin scale={0.55} body={COL.primary} ring={COL.white} /></group>
      </Float>
      {BIN_X.map((x, i) => <group key={i} position={[x, -0.75, 0]} rotation={[0, (1 - i) * 0.18, 0]}><WheelieBin color={BIN_C[i]} lidRef={lids[i]} label={bins[i].label} labelColor={BIN_C[i]} /></group>)}
      {drops.map(({ I }, i) => <group key={i} ref={(el) => {
    items.current[i] = el;
  }} scale={1.4}><I /></group>)}
    </group>;
}
function HeroScene({ active }) {
  return <Canvas
    frameloop={active ? "always" : "never"}
    dpr={[1, 1.5]}
    camera={{ position: [0, 0.5, 6.6], fov: 40 }}
    gl={{ antialias: true, alpha: true }}
    onCreated={({ gl }) => gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "")}
  >
      <Rig /><World />
    </Canvas>;
}
export {
  HeroScene as default
};

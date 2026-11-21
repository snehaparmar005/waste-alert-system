import { Environment, Lightformer, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
const COL = { primary: "#17803F", ink: "#0F2A2E", teal: "#0F4C5C", green: "#1E9E4A", yellow: "#F5C518", bio: "#2E9E5B", nonbio: "#2F80ED", hazard: "#E5484D", white: "#ffffff", lens: "#12302F" };
function Rig() {
  const [, setDpr] = useState(1.5);
  return <>
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1} color="#bfe8cf" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={1} color="#fff6d0" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
    </>;
}
function Pin({ scale = 1, body = COL.teal, ring = COL.white }) {
  return <group scale={scale}>
      <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.8, 48, 48]} /><meshPhysicalMaterial color={body} roughness={0.15} clearcoat={1} /></mesh>
      <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.69, 1.3, 48]} /><meshPhysicalMaterial color={body} roughness={0.15} clearcoat={1} /></mesh>
      <mesh position={[0, 0.35, 0.62]}><torusGeometry args={[0.38, 0.08, 16, 48]} /><meshStandardMaterial color={ring} /></mesh>
      <mesh position={[0, 0.35, 0.6]}><sphereGeometry args={[0.32, 32, 32]} /><meshPhysicalMaterial color={COL.lens} roughness={0} metalness={0.2} transmission={0.2} clearcoat={1} /></mesh>
      <mesh position={[-0.1, 0.46, 0.9]}><sphereGeometry args={[0.06, 16, 16]} /><meshBasicMaterial color={COL.yellow} /></mesh>
      <mesh position={[0.15, 1.28, 0]} rotation={[0, 0, -0.6]} scale={[0.22, 0.45, 0.06]}><sphereGeometry args={[1, 24, 24]} /><meshStandardMaterial color={COL.green} /></mesh>
    </group>;
}
const Bottle = () => <group><mesh><cylinderGeometry args={[0.14, 0.14, 0.5, 20]} /><meshPhysicalMaterial color="#7fc3ff" transmission={0.5} roughness={0.1} /></mesh>
    <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.06, 0.12, 0.15, 16]} /><meshPhysicalMaterial color="#7fc3ff" transmission={0.5} /></mesh>
    <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.065, 0.065, 0.06, 16]} /><meshStandardMaterial color={COL.nonbio} /></mesh></group>;
const Box = () => <mesh><boxGeometry args={[0.42, 0.32, 0.36]} /><meshStandardMaterial color="#c49a6c" roughness={0.9} /></mesh>;
const Battery = () => <group><mesh><cylinderGeometry args={[0.1, 0.1, 0.4, 20]} /><meshStandardMaterial color={COL.hazard} metalness={0.4} roughness={0.3} /></mesh>
    <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.04, 0.04, 0.05, 12]} /><meshStandardMaterial color="#cccccc" metalness={1} roughness={0.2} /></mesh></group>;
const Apple = () => <group><mesh scale={[1, 1.3, 1]}><sphereGeometry args={[0.12, 20, 20]} /><meshStandardMaterial color="#f3e3b0" /></mesh>
    <mesh position={[0, 0.17, 0]}><sphereGeometry args={[0.14, 20, 20, 0, Math.PI * 2, 0, 1]} /><meshStandardMaterial color="#d9443a" /></mesh>
    <mesh position={[0, -0.17, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.14, 20, 20, 0, Math.PI * 2, 0, 1]} /><meshStandardMaterial color="#d9443a" /></mesh></group>;
const Can = () => <mesh rotation={[0.3, 0, 0.5]} scale={[1, 0.6, 1]}><cylinderGeometry args={[0.13, 0.11, 0.4, 9]} /><meshStandardMaterial color="#b8c4cc" metalness={0.9} roughness={0.35} /></mesh>;
const Banana = () => <group rotation={[0, 0, 0.4]}><mesh><torusGeometry args={[0.2, 0.055, 8, 18, Math.PI * 0.9]} /><meshStandardMaterial color="#F2C230" roughness={0.6} /></mesh></group>;
function labelTexture(text, color) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const x = c.getContext("2d");
  if (!x) return null;
  const plate = () => {
    x.beginPath();
    if (typeof x.roundRect === "function") x.roundRect(10, 10, 492, 236, 44);
    else x.rect(10, 10, 492, 236);
  };
  x.fillStyle = "#ffffff";
  plate();
  x.fill();
  x.lineWidth = 16;
  x.strokeStyle = color;
  plate();
  x.stroke();
  x.fillStyle = color;
  x.fillRect(150, 206, 212, 14);
  let size = 130;
  x.textAlign = "center";
  x.textBaseline = "middle";
  do {
    x.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    size -= 6;
  } while (x.measureText(text).width > 458 && size > 34);
  x.fillStyle = COL.ink;
  x.fillText(text, 256, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function WheelieBin({ color, lidRef, label, labelColor }) {
  const tex = useMemo(() => label ? labelTexture(label.toUpperCase(), labelColor ?? color) : null, [label, labelColor, color]);
  const wide = (label?.length ?? 0) > 6;
  const W = wide ? 0.76 : 0.58, H = W / 2;
  return <group>
      <mesh rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.72, 0.6, 1.3, 4, 1]} /><meshStandardMaterial color={color} roughness={0.45} flatShading /></mesh>
      {tex ? <mesh position={[0, 0.05, wide ? 0.53 : 0.5]} rotation={[-0.07, 0, 0]}><planeGeometry args={[W, H]} /><meshBasicMaterial map={tex} transparent toneMapped={false} /></mesh> : <mesh position={[0, 0.05, 0.47]} rotation={[-0.07, 0, 0]}><planeGeometry args={[0.5, 0.36]} /><meshStandardMaterial color="#ffffff" /></mesh>}
      <group ref={lidRef ?? null} position={[0, 0.68, -0.52]}>
        <mesh position={[0, 0, 0.52]}><boxGeometry args={[1.1, 0.09, 1.06]} /><meshStandardMaterial color={color} roughness={0.35} /></mesh>
        <mesh position={[0, 0.07, 0.02]}><boxGeometry args={[0.6, 0.06, 0.08]} /><meshStandardMaterial color="#2b3a3d" /></mesh>
      </group>
      {[-0.4, 0.4].map((x) => <mesh key={x} position={[x, -0.6, -0.36]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.14, 0.14, 0.1, 14]} /><meshStandardMaterial color="#26302f" roughness={0.8} /></mesh>)}
    </group>;
}
export {
  Apple,
  Banana,
  Battery,
  Bottle,
  Box,
  COL,
  Can,
  Pin,
  Rig,
  WheelieBin
};

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Points, PointMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

const PARTICLE_POSITIONS = (() => {
  const sphere = new Float32Array(2200 * 3);

  for (let i = 0; i < 2200; i += 1) {
    const radius = 1.6 + Math.random() * 0.18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    sphere[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    sphere[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    sphere[i * 3 + 2] = radius * Math.cos(phi);
  }

  return sphere;
})();

function SpherePoints() {
  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.12;
    pointsRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.2) * 0.12;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.22} floatIntensity={0.35}>
      <Points
        ref={pointsRef}
        positions={PARTICLE_POSITIONS}
        stride={3}
        frustumCulled
      >
        <PointMaterial
          transparent
          color="#00f0ff"
          size={0.028}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
      <mesh rotation={[0.4, 0.2, 0]}>
        <torusKnotGeometry args={[1.15, 0.02, 160, 12]} />
        <meshStandardMaterial
          color="#7000ff"
          emissive="#7000ff"
          emissiveIntensity={1.25}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  );
}

export function ParticleSphere() {
  return (
    <div className="glass-panel neon-outline relative h-[360px] w-full overflow-hidden rounded-2xl md:h-[480px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[rgba(10,10,15,0.72)] to-transparent" />
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 4.8], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a0f"]} />
        <fog attach="fog" args={["#0a0a0f", 5, 9]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 3, 4]} intensity={18} color="#00f0ff" />
        <pointLight position={[-3, -2, -4]} intensity={12} color="#7000ff" />
        <SpherePoints />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/60 backdrop-blur-md">
        <span>Particle cluster synchronized</span>
        <span className="text-cyan-300">60 FPS target</span>
      </div>
    </div>
  );
}

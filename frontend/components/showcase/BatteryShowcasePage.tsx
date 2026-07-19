"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera, Text } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer } from "@react-three/postprocessing";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";
import {
  Activity,
  AudioLines,
  BatteryCharging,
  ChartNoAxesCombined,
  Cpu,
  Gauge,
  Radar,
  Sparkles,
  Thermometer,
  TriangleAlert,
  Waves,
  Zap,
} from "lucide-react";

import {
  buildChannels,
  evaluateMetricLevel,
  formatTimestamp,
  type AlarmLevel,
  type BatteryPayload,
} from "@/lib/battery-dashboard";

gsap.registerPlugin(ScrollTrigger);

const API_BASE = "http://localhost:8000";

type ShowcaseSignal = {
  payload: BatteryPayload | null;
  transport: "rest" | "websocket" | "disconnected";
  trend: BatteryPayload[];
  updatedAt: string | null;
};

type StoryChapter = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  tone: string;
  icon: React.ComponentType<{ className?: string }>;
};

const narrativeBeats: StoryChapter[] = [
  {
    id: "energy",
    eyebrow: "章节 01",
    title: "入场",
    body: "相机从远处推近发光电池立方体，主标题从粒子群里被照亮，先把能量感立住。",
    accent: "主标题从粒子中浮现",
    tone: "from-cyan-300/24 via-sky-200/10 to-transparent",
    icon: Zap,
  },
  {
    id: "signal",
    eyebrow: "章节 02",
    title: "数据层",
    body: "相机环绕立方体，蓝色粒子收束成实时数据曲线，让信号本身成为画面结构。",
    accent: "粒子形成实时数据曲线",
    tone: "from-emerald-300/20 via-cyan-300/10 to-transparent",
    icon: AudioLines,
  },
  {
    id: "risk",
    eyebrow: "章节 03",
    title: "风险层",
    body: "相机穿透电池立方体，红色异常粒子在内部闪烁，风险信息不是弹窗，而是空间事件。",
    accent: "异常预警",
    tone: "from-orange-300/24 via-rose-300/12 to-transparent",
    icon: TriangleAlert,
  },
  {
    id: "future",
    eyebrow: "章节 04",
    title: "未来",
    body: "镜头拉出，立方体拆解成工厂全景，叙事从单体能量过渡到工业未来。",
    accent: "工业未来",
    tone: "from-violet-300/20 via-cyan-300/12 to-transparent",
    icon: Radar,
  },
];

const scenarioRows = [
  "储能项目介绍与客户演示",
  "化成 / 分容监控系统汇报",
  "方案投标时的产品化讲解",
  "现场监控品牌升级入口",
] as const;

const deliverableRows = [
  {
    title: "实时采样链路",
    body: "展示层直接承接现有 `current-data` 与 `WebSocket` 数据入口，不需要为了好看重写后端采样逻辑。",
  },
  {
    title: "异常判断语言",
    body: "总压、总流、压差、温升与 SOC 已经能形成一套风险表达语言，适合用来做项目介绍、评审与售前演示。",
  },
  {
    title: "可继续扩展的内容骨架",
    body: "后续可以继续接入系统截图、历史趋势、现场照片、项目参数和客户价值说明，逐步变成完整官网。",
  },
] as const;

const operatingMoments = [
  {
    label: "交接班",
    title: "交接班前 5 分钟",
    body: "值班人员先看总压、总流、热点温升和当前告警数量，再判断是否需要深入通道级排查。",
  },
  {
    label: "异常追溯",
    title: "异常追溯时刻",
    body: "当单体压差和热区温度抬头时，界面需要第一时间给出异常通道与趋势上下文，而不是只丢一个红点。",
  },
  {
    label: "客户演示",
    title: "客户演示场景",
    body: "对外讲解时，这套页面负责把“系统能力”“现场可信度”“项目完成度”压缩成一条更容易被记住的视觉路径。",
  },
] as const;

const trustPillars = [
  {
    label: "交付边界",
    title: "先交付可演示、可汇报、可继续接真实系统的数据展示层",
    body: "这套页面的边界很清楚：它不是替代现场业务系统，而是作为独立展示前端，用来承接介绍、评审、演示和售前表达。",
  },
  {
    label: "稳定性口径",
    title: "真实链路优先，断链时也不让页面失语",
    body: "页面优先读取现有 REST / WebSocket 数据；如果现场接口暂时不可用，展示层会回落到备用演示模式，保证讲解不中断。",
  },
  {
    label: "扩展路径",
    title: "从展示页出发，后续能继续接系统截图、趋势回放和项目档案",
    body: "现在这一步先把项目气质和系统事实立住，后面可以继续扩成完整官网、演示站或者客户交付前的产品化入口。",
  },
] as const;

const assuranceRows = [
  {
    title: "性能表现",
    body: "视觉层优先保证滚动流畅和信息清晰，复杂 3D 效果不是刚需，必要时可降级成稳定的 2D 叙事版本。",
  },
  {
    title: "稳定性",
    body: "展示页不改原有采样服务，不碰数据接入核心逻辑，默认沿用当前后端输出，减少把展示层风险带回业务链的可能。",
  },
  {
    title: "可扩展性",
    body: "现有结构已经为更多系统截图、历史趋势、阈值配置说明和交付文档入口预留了位置，后续扩展不会推翻重来。",
  },
] as const;

const caseVoiceRows = [
  "对于客户，这不是一堆工业术语，而是一眼能看出系统成熟度的第一印象页面。",
  "对于项目汇报，这页可以先压住气氛，再自然过渡到系统能力、部署方式和现场价值。",
  "对于后续产品化，它已经是一层可继续累积资产的前端门面，而不是一次性的演示稿。",
] as const;

function createMockPayload(): BatteryPayload {
  const now = new Date();
  const seconds = now.getSeconds();

  return {
    voltage: Number((52.1 + Math.sin(seconds / 7) * 2.1).toFixed(2)),
    current: Number((16 + Math.cos(seconds / 8) * 8.4).toFixed(1)),
    temperature: Number((31 + Math.sin(seconds / 6) * 2.2).toFixed(1)),
    pressure: Number((0.43 + Math.cos(seconds / 9) * 0.08).toFixed(3)),
    soc: Number((79 + Math.sin(seconds / 10) * 5.5).toFixed(1)),
    cell_diff: Number((36 + Math.cos(seconds / 5) * 22).toFixed(0)),
    max_temp: Number((44 + Math.sin(seconds / 6) * 5.2).toFixed(1)),
    connection_status: "fallback",
    timestamp: now.toISOString(),
  };
}

function levelLabel(level: AlarmLevel) {
  if (level === "L3") return "Critical";
  if (level === "L2") return "Warning";
  if (level === "L1") return "Watch";
  return "Nominal";
}

function formatMetricValue(value: number, digits = 1) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function useShowcaseSignal(): ShowcaseSignal {
  const [state, setState] = useState<ShowcaseSignal>({
    payload: null,
    transport: "rest",
    trend: [],
    updatedAt: null,
  });

  useEffect(() => {
    let mounted = true;
    let socket: WebSocket | null = null;
    let fallbackTimer: number | null = null;

    const ingest = (payload: BatteryPayload, transport: ShowcaseSignal["transport"]) => {
      if (!mounted) return;
      setState((current) => ({
        payload,
        transport,
        trend: [...current.trend, payload].slice(-28),
        updatedAt: payload.timestamp,
      }));
    };

    const startFallback = () => {
      if (fallbackTimer !== null) return;
      ingest(createMockPayload(), "disconnected");
      fallbackTimer = window.setInterval(() => {
        ingest(createMockPayload(), "disconnected");
      }, 2200);
    };

    const stopFallback = () => {
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const fetchInitial = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/current-data`, { cache: "no-store" });
        const payload = (await response.json()) as BatteryPayload;
        stopFallback();
        ingest(payload, "rest");
      } catch {
        startFallback();
      }
    };

    fetchInitial();

    try {
      socket = new WebSocket("ws://localhost:8000/ws");
      socket.onopen = () => {
        if (!mounted) return;
        setState((current) => ({ ...current, transport: "websocket" }));
        stopFallback();
      };
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as BatteryPayload;
        stopFallback();
        ingest(payload, "websocket");
      };
      socket.onerror = () => {
        if (!mounted) return;
        setState((current) => ({ ...current, transport: "disconnected" }));
        startFallback();
      };
      socket.onclose = () => {
        if (!mounted) return;
        setState((current) => ({ ...current, transport: "disconnected" }));
        startFallback();
      };
    } catch {
      startFallback();
    }

    return () => {
      mounted = false;
      socket?.close();
      stopFallback();
    };
  }, []);

  return state;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function segmentProgress(progress: number, index: number, total: number) {
  const start = index / total;
  const end = (index + 1) / total;
  return clamp01((progress - start) / Math.max(end - start, 0.0001));
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smooth(value: number) {
  return value * value * (3 - 2 * value);
}

function createParticleField(count: number, spread: THREE.Vector3) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * spread.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
  }
  return positions;
}

function createDataCurve(count: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(count - 1, 1);
    positions[i * 3] = mix(-3.8, 3.8, t);
    positions[i * 3 + 1] = Math.sin(t * Math.PI * 2.4) * 0.9 + Math.cos(t * Math.PI * 6) * 0.18;
    positions[i * 3 + 2] = Math.cos(t * Math.PI * 2) * 0.7 - 0.25;
  }
  return positions;
}

function createFactoryBlocks() {
  return Array.from({ length: 16 }, (_, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    return {
      position: [col * 1.65 - 2.4, row * 0.68 - 1.0, -row * 1.15 - 1.4] as [number, number, number],
      scale: [0.8 + (index % 3) * 0.18, 0.24 + row * 0.05, 1.1 + (index % 2) * 0.4] as [number, number, number],
    };
  });
}

function ParticleField({
  progress,
  velocity,
}: {
  progress: number;
  velocity: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const positions = useMemo(() => createParticleField(1800, new THREE.Vector3(18, 10, 22)), []);

  useFrame((state) => {
    const points = pointsRef.current;
    const geometry = geometryRef.current;
    if (!points || !geometry) return;

    const visible = Math.floor(mix(850, 1800, clamp01(Math.abs(velocity) * 1.8)));
    geometry.setDrawRange(0, visible);
    points.rotation.y += 0.0009;
    points.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.12;

    const material = points.material as THREE.PointsMaterial;
    material.size = mix(0.026, 0.05, clamp01(Math.abs(velocity) * 1.5));
    material.opacity = mix(0.28, 0.74, smooth(segmentProgress(progress, 1, 4)));
  });

  return (
    <points ref={pointsRef} position={[0, 0.2, -1.5]}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#48c8ff" size={0.03} sizeAttenuation transparent opacity={0.42} depthWrite={false} />
    </points>
  );
}

function DataCurvePoints({ progress }: { progress: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => createDataCurve(140), []);
  const reveal = smooth(segmentProgress(progress, 1, 4));

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = mix(0.2, 1.2, reveal);
    pointsRef.current.rotation.x = 0.15 + Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
    pointsRef.current.position.y = mix(-0.7, 0.15, reveal);
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = reveal * 0.95;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8be9ff" size={0.08} transparent opacity={0} depthWrite={false} />
    </points>
  );
}

function WarningParticles({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const warning = smooth(segmentProgress(progress, 2, 4));
  const particles = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) => ({
        position: [Math.sin(index * 0.7) * 0.75, Math.cos(index * 0.37) * 0.8, Math.sin(index * 0.51) * 0.75] as [number, number, number],
        scale: 0.018 + (index % 4) * 0.008,
      })),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.004;
    groupRef.current.position.z = mix(-0.4, 0.35, warning);
    groupRef.current.visible = warning > 0.02;
    groupRef.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const pulse = 0.45 + Math.sin(state.clock.elapsedTime * 6 + index * 0.4) * 0.35;
      material.emissiveIntensity = pulse * warning * 2.8;
      material.opacity = warning;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position} scale={particle.scale}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial color="#ff6b7a" emissive="#ff3048" emissiveIntensity={0.2} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

function FactoryReveal({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const factory = smooth(segmentProgress(progress, 3, 4));
  const blocks = useMemo(() => createFactoryBlocks(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.visible = factory > 0.02;
    groupRef.current.position.set(0, mix(-2.2, -1.05, factory), mix(-6, -2.1, factory));
    groupRef.current.rotation.x = mix(0.65, 0.28, factory);
    groupRef.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;
      mesh.position.y += Math.sin(state.clock.elapsedTime * 0.9 + index * 0.24) * 0.0008;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = factory * 0.95;
      material.emissiveIntensity = 0.3 + factory * 1.1;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {blocks.map((block, index) => (
        <mesh key={index} position={block.position} scale={block.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0f2740" emissive="#2ab8ff" emissiveIntensity={0.4} transparent opacity={0} roughness={0.25} metalness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function SceneLabels({
  progress,
}: {
  progress: number;
}) {
  const labels = [
    { text: "WE BUILD ENERGY", sub: "入场", position: [0, 1.95, 0.8] as [number, number, number], phase: 0 },
    { text: "LIVE DATA CURVE", sub: "数据层", position: [2.85, 1.25, -0.2] as [number, number, number], phase: 1 },
    { text: "异常预警", sub: "风险层", position: [-2.1, 0.1, 0.95] as [number, number, number], phase: 2 },
    { text: "INDUSTRIAL FUTURE", sub: "未来", position: [0, 2.1, -2.4] as [number, number, number], phase: 3 },
  ];

  return (
    <group>
      {labels.map((label) => {
        const local = smooth(segmentProgress(progress, label.phase, 4));
        const fade = clamp01(local - smooth(segmentProgress(progress, Math.min(label.phase + 1, 3), 4)) * 0.45);
        return (
          <group key={label.text} position={label.position} visible={fade > 0.02}>
            <Text
              fontSize={label.phase === 0 ? 0.38 : 0.22}
              letterSpacing={0.08}
              color={label.phase === 2 ? "#ff8a9d" : "#dff7ff"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor={label.phase === 2 ? "#54101e" : "#0f2236"}
              fillOpacity={fade}
            >
              {label.text}
            </Text>
            <Text
              position={[0, -0.34, 0]}
              fontSize={0.1}
              letterSpacing={0.18}
              color="#71d9ff"
              anchorX="center"
              anchorY="middle"
              fillOpacity={fade * 0.9}
            >
              {label.sub}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function BatterySceneRig({
  progress,
  velocity,
}: {
  progress: number;
  velocity: number;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const envRef = useRef<THREE.Group>(null);
  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const intro = smooth(segmentProgress(progress, 0, 4));
  const data = smooth(segmentProgress(progress, 1, 4));
  const risk = smooth(segmentProgress(progress, 2, 4));
  const future = smooth(segmentProgress(progress, 3, 4));
  const focusDistance = mix(0.028, 0.015, intro) + mix(0, -0.004, risk) + mix(0, 0.008, future);
  const focalLength = mix(0.018, 0.028, risk);
  const bokehScale = mix(1.6, 3.4, risk) + mix(0, -1.1, future);

  useFrame((state, delta) => {
    const overall = clamp01(progress);

    if (cameraRef.current) {
      const camX = mix(0, 2.6, data) + mix(0, -1.2, risk);
      const camY = mix(1.4, 0.48, intro) + mix(0, 0.55, future);
      const camZ = mix(10.8, 3.55, intro) + mix(0, -0.7, data) + mix(0, -1.4, risk) + mix(0, 6.2, future);
      tempVector.set(camX, camY, camZ);
      cameraRef.current.position.lerp(tempVector, 1 - Math.exp(-delta * 2.8));
      cameraRef.current.lookAt(mix(0, 0.4, data), mix(0.1, -0.18, risk), mix(0, -2.6, future));
    }

    if (shellRef.current && coreRef.current) {
      shellRef.current.rotation.y += delta * 0.18;
      shellRef.current.rotation.x = mix(0.08, -0.08, risk);
      coreRef.current.rotation.y += delta * 0.32;
      coreRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;

      const shellMat = shellRef.current.material as THREE.MeshPhysicalMaterial;
      shellMat.opacity = mix(0.16, 0.08, risk);
      shellMat.roughness = mix(0.18, 0.04, data);

      const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
      coreMat.emissiveIntensity = 1.4 + data * 1.3 + risk * 0.55;
      coreRef.current.scale.setScalar(mix(0.98, 1.08, future));
    }

    if (envRef.current) {
      envRef.current.rotation.y = overall * Math.PI * 0.18;
      envRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.08;
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={36} position={[0, 1.4, 10.8]} />
      <color attach="background" args={["#0a0a0a"]} />
      <fog attach="fog" args={["#0a0a0a", 6, 22]} />
      <ambientLight intensity={0.14} />
      <directionalLight position={[4, 6, 6]} intensity={1.8} color="#5ac8ff" />
      <spotLight position={[-5, 4, 3]} intensity={42} angle={0.34} penumbra={0.75} color="#0ea5ff" />
      <spotLight position={[0, -2, 5]} intensity={18} angle={0.55} penumbra={1} color="#7dd3fc" />

      <group ref={envRef}>
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.18}>
          <mesh ref={shellRef}>
            <boxGeometry args={[2.2, 2.9, 1.6]} />
            <meshPhysicalMaterial color="#11324f" transmission={0.72} thickness={1.6} roughness={0.16} metalness={0.2} transparent opacity={0.16} emissive="#0ea5ff" emissiveIntensity={0.5} />
          </mesh>
          <mesh ref={coreRef} scale={[0.86, 1.18, 0.68]}>
            <boxGeometry args={[1.55, 2.2, 1.05]} />
            <meshStandardMaterial color="#062846" emissive="#00a8ff" emissiveIntensity={1.6} metalness={0.45} roughness={0.22} />
          </mesh>
          <mesh position={[0, 1.18, 0.54]} scale={[0.92, 0.12, 0.06]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#d8f6ff" emissive="#a5ecff" emissiveIntensity={1.4} />
          </mesh>
        </Float>

        <DataCurvePoints progress={progress} />
        <WarningParticles progress={progress} />
        <FactoryReveal progress={progress} />
        <ParticleField progress={progress} velocity={velocity} />
        <SceneLabels progress={progress} />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.25} luminanceThreshold={0.16} />
        <DepthOfField focusDistance={focusDistance} focalLength={focalLength} bokehScale={bokehScale} height={480} />
      </EffectComposer>
    </>
  );
}

function ScrollNarrativeScene({
  progress,
  velocity,
}: {
  progress: number;
  velocity: number;
}) {
  return (
    <div className="relative h-[78vh] min-h-[620px] overflow-hidden rounded-[40px] border border-white/10 bg-[#05070c] shadow-[0_40px_160px_rgba(0,0,0,0.52)]">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: true }} className="!absolute inset-0">
        <BatterySceneRig progress={progress} velocity={velocity} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(96,206,255,0.12),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.14)_44%,rgba(0,0,0,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-x-[2.4%] top-[3%] bottom-[2.6%] rounded-[32px] border border-white/[0.06]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
    </div>
  );
}


export function BatteryShowcasePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLDivElement | null>(null);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const { payload, transport, updatedAt } = useShowcaseSignal();

  useEffect(() => {
    const root = rootRef.current;
    const story = storyRef.current;
    if (!root || !story) return;

    const lenis = new Lenis({
      duration: 1.18,
      smoothWheel: true,
      syncTouch: true,
    });

    const onFrame = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);

    const panels = gsap.utils.toArray<HTMLElement>("[data-showcase-panel]");
    panels.forEach((panel) => {
      gsap.fromTo(
        panel,
        { y: 70, opacity: 0.25 },
        {
          y: 0,
          opacity: 1,
          duration: 1.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: panel,
            start: "top 84%",
          },
        },
      );
    });

    ScrollTrigger.create({
      trigger: story,
      start: "top top",
      end: "bottom bottom",
      pin: "[data-story-stage]",
      scrub: true,
      onUpdate: (self) => {
        setSceneProgress(self.progress);
        setScrollVelocity(Math.min(1.6, Math.abs(self.getVelocity()) / 1800));
      },
    });

    gsap.to("[data-story-stage]", {
      scale: 1.015,
      ease: "none",
      scrollTrigger: {
        trigger: story,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
      },
    });

    return () => {
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const statusLevel = payload
    ? evaluateMetricLevel("max_temp", payload.max_temp, {
        voltage: { green: 48, yellow: 52, orange: 55, red: 60, unit: "V" },
        current: { green: 20, yellow: 30, orange: 40, red: 50, unit: "A" },
        cell_diff: { green: 30, yellow: 50, orange: 80, red: 100, unit: "mV" },
        max_temp: { green: 40, yellow: 45, orange: 60, red: 70, unit: "°C" },
        pressure: { green: 0.3, yellow: 0.5, orange: 0.8, red: 1.0, unit: "MPa" },
        soc: {
          green_low: 20,
          yellow_low: 10,
          orange_low: 5,
          red_low: 0,
          green_high: 95,
          yellow_high: 98,
          orange_high: 100,
          unit: "%",
        },
      })
    : "normal";

  const topChannels = payload
    ? buildChannels(payload)
        .slice()
        .sort((a, b) => {
          const order = { critical: 0, warning: 1, offline: 2, normal: 3 } as const;
          return order[a.status] - order[b.status] || b.temp - a.temp || b.voltage - a.voltage;
        })
    : [];

  const channelHealthSummary = {
    critical: topChannels.filter((channel) => channel.status === "critical").length,
    warning: topChannels.filter((channel) => channel.status === "warning").length,
    normal: topChannels.filter((channel) => channel.status === "normal").length,
    offline: topChannels.filter((channel) => channel.status === "offline").length,
  };

  const leadMetrics = [
    {
      label: "总电压",
      value: payload ? `${formatMetricValue(payload.voltage, 2)} V` : "52.1 V",
      detail: "主电池包电压",
      icon: BatteryCharging,
    },
    {
      label: "总电流",
      value: payload ? `${formatMetricValue(payload.current, 1)} A` : "16.8 A",
      detail: "双向流动状态",
      icon: Waves,
    },
    {
      label: "最高温度",
      value: payload ? `${formatMetricValue(payload.max_temp, 1)} °C` : "44.2 °C",
      detail: "当前热区热点",
      icon: Thermometer,
    },
    {
      label: "状态等级",
      value: levelLabel(statusLevel),
      detail: "当前视觉风险级别",
      icon: TriangleAlert,
    },
  ];

  return (
    <main ref={rootRef} className="min-h-screen overflow-x-hidden bg-[#020406] text-white">
      <section id="story-scroll" ref={storyRef} className="relative mx-auto max-w-7xl px-6 pb-12 pt-6 md:px-10 md:pb-18 md:pt-8">
        <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:gap-14">
          <div className="space-y-24 pb-24 xl:pb-[90vh]">
            <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-300/8 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/78">
                <Sparkles className="size-3.5 text-cyan-300" />
                Scroll-To-Reveal Battery Narrative
              </div>
              <div className="mt-6 text-sm leading-7 text-slate-300">
                这一次主角不是 DOM 海报，而是一个真正被滚动驱动的 3D 舞台。继续往下滚，相机会推进、环绕、穿透，再拉出成工业全景。
              </div>
            </div>

            {narrativeBeats.map((chapter) => (
              <div
                key={chapter.id}
                data-story-block={chapter.id}
                className="min-h-[82vh] py-10"
              >
                <div className="sticky top-24 max-w-xl">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">{chapter.eyebrow}</div>
                  <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-5xl">
                    {chapter.title}
                  </h2>
                  <p className="mt-6 text-base leading-8 text-slate-300">{chapter.body}</p>

                  <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-3 text-white/72">
                      <chapter.icon className="size-4 text-cyan-200" />
                      <span className="text-[11px] uppercase tracking-[0.22em]">{chapter.accent}</span>
                    </div>
                    <div className="mt-4 text-sm leading-7 text-slate-300">
                      当前舞台会固定在右侧，随着你继续往下滚，它会切换成不同的视觉状态，而不是把所有内容一次性端上来。
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div data-story-stage className="top-20 xl:sticky origin-center">
              <ScrollNarrativeScene progress={sceneProgress} velocity={scrollVelocity} />
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {leadMetrics.map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
                    <div className="mt-2 text-xs leading-6 text-slate-300">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="system-summary" className="border-y border-white/8 bg-[linear-gradient(180deg,rgba(5,9,14,0.96),rgba(6,10,16,1))]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
          <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
            <div data-showcase-panel>
              <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/72">项目事实</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                顶级官网不只是有气氛，也要让人迅速抓到项目事实
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
                这套展示页不是纯概念稿，它背后对应的是一个已经具备实时采样、阈值判断、通道建模和异常状态表达能力的电池监控系统。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "监控指标", value: "6 类核心信号", detail: "总压、总流、压力、荷电状态、单体压差、热区温度" },
                { label: "通道模型", value: `${topChannels.length || 16} 通道`, detail: "可按状态、温升、压差继续拆分与排序" },
                { label: "链路模式", value: transport === "websocket" ? "REST + WebSocket" : "REST 引导链路", detail: "数据断开时仍可进入备用演示模式" },
                { label: "刷新时刻", value: updatedAt ? formatTimestamp(updatedAt).slice(11) : "--", detail: "展示层会带着最新采样时间说话" },
              ].map((item) => (
                <div
                  key={item.label}
                  data-showcase-panel
                  className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{item.label}</div>
                  <div className="mt-4 text-3xl font-semibold text-white">{item.value}</div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div data-showcase-panel className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,13,20,0.96),rgba(7,10,14,0.92))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex items-center gap-3 text-white/76">
              <Cpu className="size-4 text-cyan-200" />
              <span className="text-[11px] uppercase tracking-[0.22em]">能力层</span>
            </div>
              <h3 className="mt-5 text-2xl font-semibold leading-tight text-white md:text-3xl">它不是只会播动画，而是真的在表达系统能力</h3>
            <div className="mt-8 space-y-4">
              {deliverableRows.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5">
                  <div className="text-lg font-semibold text-white">{item.title}</div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div data-showcase-panel className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(85,230,255,0.12),transparent_30%),rgba(255,255,255,0.03)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex items-center gap-3 text-white/76">
              <Gauge className="size-4 text-cyan-200" />
              <span className="text-[11px] uppercase tracking-[0.22em]">当前系统状态</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { label: "严重", value: channelHealthSummary.critical, tone: "text-rose-300" },
                { label: "预警", value: channelHealthSummary.warning, tone: "text-amber-200" },
                { label: "正常", value: channelHealthSummary.normal, tone: "text-emerald-200" },
                { label: "离线", value: channelHealthSummary.offline, tone: "text-slate-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/18 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">{item.label}</div>
                  <div className={`mt-3 text-3xl font-semibold ${item.tone}`}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">现场判断提示</div>
              <div className="mt-4 text-lg font-semibold text-white">
                {topChannels[0]
                  ? `优先关注 CH${String(topChannels[0].ch).padStart(2, "0")}，当前 ${topChannels[0].temp.toFixed(1)} °C / ${topChannels[0].voltage.toFixed(2)} V`
                  : "等待通道数据进入"}
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-300">
                官网内容也要保留这种“现场感”，这样页面才像真项目，不像只有设计师存在的概念稿。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[linear-gradient(180deg,rgba(7,10,14,0.92),rgba(4,6,9,1))]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
          <div data-showcase-panel className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/72">真实使用时刻</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              顶级官网会把真实使用时刻讲出来，而不是只讲抽象能力
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {operatingMoments.map((item) => (
              <div
                key={item.title}
                data-showcase-panel
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{item.label}</div>
                <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
        <div data-showcase-panel className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/72">交付信心</div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            顶级官网最后一定会回答一句话: 这个东西到底能不能放心拿去讲、拿去交付
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {trustPillars.map((item) => (
            <div
              key={item.title}
              data-showcase-panel
              className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,13,20,0.96),rgba(7,10,14,0.92))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.34)]"
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{item.label}</div>
              <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/8 bg-[linear-gradient(180deg,rgba(5,9,14,0.96),rgba(7,10,16,1))]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
          <div className="grid gap-8 xl:grid-cols-[1.04fr_0.96fr]">
            <div data-showcase-panel className="rounded-[36px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-8">
              <div className="flex items-center gap-3 text-white/76">
                <Activity className="size-4 text-cyan-200" />
                <span className="text-[11px] uppercase tracking-[0.22em]">保障说明</span>
              </div>
              <h3 className="mt-5 text-2xl font-semibold leading-tight text-white md:text-3xl">性能、稳定性、可扩展性要像产品说明，而不是像承诺口号</h3>
              <div className="mt-8 grid gap-4">
                {assuranceRows.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/18 px-5 py-5">
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-3 text-sm leading-7 text-slate-300">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div data-showcase-panel className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(84,228,255,0.12),transparent_28%),rgba(255,255,255,0.03)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-8">
              <div className="flex items-center gap-3 text-white/76">
                <Radar className="size-4 text-cyan-200" />
                <span className="text-[11px] uppercase tracking-[0.22em]">案例口吻</span>
              </div>
              <h3 className="mt-5 text-2xl font-semibold leading-tight text-white md:text-3xl">让页面说话的口吻，更像案例总结而不是设计宣言</h3>
              <div className="mt-8 space-y-4">
                {caseVoiceRows.map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5 text-sm leading-7 text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[linear-gradient(180deg,rgba(7,10,14,0.92),rgba(4,6,9,1))]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: Activity,
                title: "滚动不再平",
                body: "现在滚动不是一串普通区块，而是会经历压住、接管、拉高风险、收束这四个明显阶段。",
              },
              {
                icon: ChartNoAxesCombined,
                title: "数据成了分镜素材",
                body: "电压、电流、温升、压差不再只是被展示，而是直接参与章节切换的情绪与节奏。",
              },
              {
                icon: Cpu,
                title: "还保留工业可信度",
                body: "再高级的展示也不应该像科幻海报，它最后还是要落回‘这个系统真的能跑’的可信感。",
              },
            ].map((item) => (
              <div
                key={item.title}
                data-showcase-panel
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
              >
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-200 w-fit">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="system-summary" className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
          <div data-showcase-panel>
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/72">系统总结</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              最终还是要回到一个可以拿去讲项目的系统感
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              这套展示页的目标不是做概念艺术，而是把现有电池监控系统包装成一个更像高端产品的项目表达入口。
            </p>
            <div className="mt-8 space-y-3">
              {scenarioRows.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div data-showcase-panel className="rounded-[36px] border border-white/10 bg-[linear-gradient(120deg,rgba(5,11,18,0.98),rgba(15,16,34,0.94))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "数据链路", value: transport === "websocket" ? "WebSocket 实时链路" : transport === "rest" ? "REST 引导链路" : "备用演示模式" },
                { label: "热区温度", value: payload ? `${formatMetricValue(payload.max_temp, 1)} °C` : "--" },
                { label: "荷电状态", value: payload ? `${formatMetricValue(payload.soc, 1)} %` : "--" },
                { label: "状态等级", value: levelLabel(statusLevel) },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">{item.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/18 p-5">
              <div className="flex items-center gap-3 text-white/75">
                <Radar className="size-4 text-cyan-200" />
                <span className="text-[11px] uppercase tracking-[0.22em]">本轮变化</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                这一版最重要的不是某个单独元素，而是滚动本身终于开始承担叙事职责。页面现在更像一段分镜，而不是一页漂亮但平的介绍稿。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

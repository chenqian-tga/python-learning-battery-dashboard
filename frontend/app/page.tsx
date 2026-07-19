 "use client";

import {
  ArrowUpRight,
  Camera,
  Layers3,
  Globe,
  BriefcaseBusiness,
  Sparkles,
  Star,
} from "lucide-react";
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

const stackCards = [
  {
    eyebrow: "2.5D storytelling",
    title: "Flat graphic language with physical depth",
    text: "Large typography, floating layers, and soft perspective combine into a landing page that feels playful without losing structure.",
  },
  {
    eyebrow: "Built for portfolios",
    title: "Memorable hero, clean supporting sections",
    text: "The layout keeps the oversized type as the main stage while secondary cards add rhythm, hierarchy, and hover response.",
  },
  {
    eyebrow: "Interactive finish",
    title: "Hover lift, shadow stacking, and motion cues",
    text: "Every major block responds with a slight tilt so the page reads like a poster assembled from tangible paper objects.",
  },
] as const;

const stats = [
  {
    value: "02.5D",
    label: "Visual depth system",
    note: "Poster layout, layered cards, and soft perspective all tuned to feel tactile.",
  },
  {
    value: "07",
    label: "Layered surfaces",
    note: "Hero card, figure, grid, wordmark, badges, and support cards each move at a different depth.",
  },
  {
    value: "120%",
    label: "Bolder than a flat mock",
    note: "Built to feel like a portfolio piece first, not a neutral demo page.",
  },
] as const;

const socialLinks = [
  { label: "Instagram", handle: "@nithinmotion", href: "https://instagram.com", icon: Camera },
  { label: "LinkedIn", handle: "/in/nithin", href: "https://linkedin.com", icon: BriefcaseBusiness },
  { label: "Portfolio", handle: "selected work", href: "https://dribbble.com", icon: Globe },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function Home() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [entered, setEntered] = useState(false);
  const scrollRef = useRef(0);
  const isMobileRef = useRef(false);
  const velocityTargetRef = useRef({ background: 1, card: 1, x: 0, rotate: 0 });
  const velocityCurrentRef = useRef({ background: 1, card: 1, x: 0, rotate: 0 });
  const willChangeTimerRef = useRef<number | null>(null);
  const backgroundPatternRef = useRef<HTMLDivElement | null>(null);
  const backgroundGlowRef = useRef<HTMLDivElement | null>(null);
  const backgroundLineRef = useRef<HTMLDivElement | null>(null);
  const wordmarkRef = useRef<HTMLDivElement | null>(null);
  const eyebrowRef = useRef<HTMLDivElement | null>(null);
  const introTextRef = useRef<HTMLDivElement | null>(null);
  const heroStageRef = useRef<HTMLDivElement | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);
  const heroCardHighlightRef = useRef<HTMLDivElement | null>(null);
  const figureRef = useRef<HTMLDivElement | null>(null);
  const rightFloatRef = useRef<HTMLDivElement | null>(null);
  const leftFloatRef = useRef<HTMLDivElement | null>(null);
  const statsRefs = useRef<Array<HTMLElement | null>>([]);
  const ideaRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    const updateViewportMode = () => {
      isMobileRef.current = window.innerWidth < 768;
    };

    updatePreference();
    updateViewportMode();
    const enterTimer = window.setTimeout(() => setEntered(true), 650);

    const activateWillChange = () => {
      const layers = [
        backgroundPatternRef.current,
        backgroundGlowRef.current,
        backgroundLineRef.current,
        wordmarkRef.current,
        eyebrowRef.current,
        introTextRef.current,
        heroStageRef.current,
        heroCardRef.current,
        heroCardHighlightRef.current,
        figureRef.current,
        rightFloatRef.current,
        leftFloatRef.current,
        ...statsRefs.current,
        ...ideaRefs.current,
      ].filter(Boolean) as HTMLElement[];

      layers.forEach((layer) => {
        layer.style.willChange = "transform";
      });

      if (willChangeTimerRef.current) {
        window.clearTimeout(willChangeTimerRef.current);
      }

      willChangeTimerRef.current = window.setTimeout(() => {
        layers.forEach((layer) => {
          layer.style.willChange = "";
        });
      }, 500);
    };

    const renderParallax = () => {
      const scroll = scrollRef.current;
      const mobile = isMobileRef.current;
      const current = velocityCurrentRef.current;
      const target = velocityTargetRef.current;

      current.background += (target.background - current.background) * 0.1;
      current.card += (target.card - current.card) * 0.1;
      current.x += (target.x - current.x) * 0.1;
      current.rotate += (target.rotate - current.rotate) * 0.1;

      const backgroundMultiplier = mobile ? 1 : current.background;
      const cardMultiplier = mobile ? 1 : current.card;
      const directionX = mobile ? 0 : current.x;
      const directionRotate = mobile ? 0 : current.rotate;

      if (backgroundPatternRef.current) {
        backgroundPatternRef.current.style.transform = `translate3d(0, ${scroll * 0.04 * backgroundMultiplier}px, 0)`;
      }

      if (backgroundGlowRef.current) {
        backgroundGlowRef.current.style.transform = `translate3d(0, ${-scroll * 0.03 * backgroundMultiplier}px, 0)`;
      }

      if (backgroundLineRef.current) {
        backgroundLineRef.current.style.transform = `translate3d(0, ${
          scroll * 0.06 * backgroundMultiplier
        }px, 0)`;
      }

      if (wordmarkRef.current) {
        wordmarkRef.current.style.transform = `translate3d(0, ${-scroll * 0.1 * backgroundMultiplier}px, 0)`;
      }

      if (eyebrowRef.current) {
        eyebrowRef.current.style.transform = `translate3d(0, ${-scroll * 0.04 * cardMultiplier}px, 0)`;
      }

      if (introTextRef.current) {
        introTextRef.current.style.transform = `translate3d(0, ${-scroll * 0.02 * cardMultiplier}px, 0)`;
      }

      if (heroStageRef.current) {
        heroStageRef.current.style.transform = `translate3d(${directionX}px, ${
          -scroll * 0.08 * cardMultiplier
        }px, 0) rotateZ(${directionRotate}deg)`;
      }

      if (heroCardRef.current) {
        heroCardRef.current.style.transform = "rotate(-7deg)";
      }

      if (heroCardHighlightRef.current) {
        heroCardHighlightRef.current.style.transform = "translate3d(0, 0, 0)";
      }

      if (figureRef.current) {
        figureRef.current.style.transform = `translate3d(-50%, ${-scroll * 0.03 * cardMultiplier}px, 0)`;
      }

      if (rightFloatRef.current) {
        rightFloatRef.current.style.transform = `translate3d(${directionX}px, ${
          -scroll * 0.05 * cardMultiplier
        }px, 0) rotate(${directionRotate.toFixed(2)}deg)`;
      }

      if (leftFloatRef.current) {
        leftFloatRef.current.style.transform = `translate3d(${directionX}px, ${
          -scroll * 0.02 * cardMultiplier
        }px, 0) rotate(${directionRotate.toFixed(2)}deg)`;
      }

      statsRefs.current.forEach((card) => {
        if (!card) return;
        card.style.transform = `translate3d(${directionX * 0.2}px, ${
          -scroll * 0.015 * cardMultiplier
        }px, 0)`;
      });

      ideaRefs.current.forEach((card, index) => {
        if (!card) return;

        const transform =
          index === 0
            ? `translate3d(${directionX}px, ${-12 - scroll * 0.04 * cardMultiplier}px, 0) rotate(${
                -2.4 + directionRotate
              }deg)`
            : index === 1
              ? `translate3d(${directionX}px, ${22 - scroll * 0.05 * cardMultiplier}px, 0) rotate(${
                  0.8 + directionRotate
                }deg)`
              : `translate3d(${directionX}px, ${16 - scroll * 0.035 * cardMultiplier}px, 0) rotate(${
                  2.6 + directionRotate
                }deg)`;

        card.style.transform = transform;
      });
    };

    let rafId = 0;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-snap-section]"));

    const mainScrollTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      snap:
        sections.length > 1
          ? {
              snapTo: (value: number) => gsap.utils.snap(1 / (sections.length - 1), value),
              duration: 0.2,
              delay: 0,
            }
          : undefined,
      onUpdate: (self) => {
        scrollRef.current = self.scroll();

        const velocity = clamp(Math.abs(self.getVelocity()), 0, 200);
        const mobile = isMobileRef.current;

        velocityTargetRef.current.background = 1 + (mobile ? 0 : velocity * 0.003);
        velocityTargetRef.current.card = 1 + (mobile ? 0 : velocity * 0.002);
        velocityTargetRef.current.x = !mobile && self.direction === 1 ? 20 : 0;
        velocityTargetRef.current.rotate = !mobile && self.direction === 1 ? 1 : 0;

        activateWillChange();
      },
    });

    lenis.on("scroll", ({ scroll }: { scroll: number }) => {
      scrollRef.current = scroll;
      ScrollTrigger.update();
      activateWillChange();
      renderParallax();
    });

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    media.addEventListener("change", updatePreference);
    window.addEventListener("resize", updateViewportMode);
    renderParallax();

    return () => {
      window.clearTimeout(enterTimer);
      if (willChangeTimerRef.current) {
        window.clearTimeout(willChangeTimerRef.current);
      }
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      mainScrollTrigger.kill();
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger !== mainScrollTrigger) trigger.kill();
      });
      media.removeEventListener("change", updatePreference);
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  const introDone = entered || reducedMotion;
  const canAnimateIn = entered && !reducedMotion;

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div
          ref={backgroundPatternRef}
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(87,71,13,0.14)_1px,transparent_1.4px)] bg-[length:24px_24px]"
        />
        <div
          ref={backgroundGlowRef}
          className="absolute inset-x-[12%] top-[10%] h-[36vh] rounded-full bg-[radial-gradient(circle,rgba(255,250,210,0.45),transparent_68%)] blur-3xl"
        />
        <div className="absolute left-[4vw] top-0 h-full w-px bg-[rgba(93,78,19,0.24)]" />
        <div className="absolute right-[4vw] top-0 h-full w-px bg-[rgba(93,78,19,0.24)]" />
        <div
          ref={backgroundLineRef}
          className="absolute left-0 right-0 top-[64%] h-px bg-[rgba(93,78,19,0.2)]"
        />
      </div>

      <section
        data-snap-section
        className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col justify-between px-6 py-6 sm:px-10 lg:px-16"
      >
        <header
          className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.32em] text-[rgba(33,27,8,0.64)]"
        >
          <span>Meaning in motion</span>
          <span>2.5D portfolio concept</span>
        </header>

        <div className="relative grid gap-8 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-[4%] hidden lg:block">
              <div
                ref={wordmarkRef}
                className="select-none text-center font-[var(--font-display)] text-[clamp(5.6rem,17vw,15rem)] leading-[0.84] text-[rgba(109,96,27,0.22)]"
              >
                <div
                  className={`transition-[opacity,transform,filter,letter-spacing] duration-[1150ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    introDone
                      ? "translate-y-0 scale-100 opacity-100 blur-0 tracking-[-0.08em]"
                      : "translate-y-10 scale-[1.08] opacity-35 blur-[12px] tracking-[-0.14em]"
                  }`}
                >
                  NITHIN M
                </div>
                <div
                  className={`transition-[opacity,transform,filter,letter-spacing] duration-[1250ms] delay-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    introDone
                      ? "translate-y-0 scale-100 opacity-100 blur-0 tracking-[-0.08em]"
                      : "translate-y-14 scale-[1.1] opacity-20 blur-[14px] tracking-[-0.16em]"
                  }`}
                >
                  WARRIER
                </div>
              </div>
            </div>

            <div className="relative z-10 flex min-h-[420px] flex-col justify-end lg:min-h-[720px]">
              <div
                ref={eyebrowRef}
                className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(77,63,14,0.22)] bg-[rgba(255,248,196,0.72)] px-4 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[rgba(43,35,8,0.8)] shadow-[0_8px_22px_rgba(90,73,15,0.08)] backdrop-blur"
              >
                <Sparkles className="size-4" />
                Inspired by your reference composition
              </div>

              <div
                ref={introTextRef}
                className="max-w-[760px]"
              >
                <p className="text-lg text-[rgba(43,35,8,0.8)] sm:text-2xl">
                  Let&apos;s build something
                </p>
                <h1 className="mt-3 font-[var(--font-display)] text-[clamp(3.8rem,8vw,7.6rem)] leading-[0.9] tracking-[-0.08em] text-[var(--ink)]">
                  MEANINGFUL
                  <br />
                  AND MEMORABLE
                </h1>
                <p className="mt-6 max-w-[560px] text-base leading-7 text-[rgba(43,35,8,0.72)] sm:text-lg">
                  A 2.5D landing page concept with bold poster typography, paper-like
                  depth, and a floating character stage. It keeps the warmth of the
                  original yellow canvas while giving every block a little physical life.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`relative z-20 mx-auto w-full max-w-[520px] perspective-[2200px] transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              introDone
                ? "translate-y-0 scale-100 opacity-100 blur-0"
                : "translate-y-20 scale-[0.84] opacity-40 blur-[14px]"
            }`}
          >
            <div
              ref={heroStageRef}
              className="relative"
            >
              <div
                ref={heroCardRef}
                className={`relative mx-auto h-[520px] w-[300px] rounded-[42px] border border-[rgba(76,61,14,0.26)] bg-[linear-gradient(180deg,#f4e77f_0%,#edd965_100%)] shadow-[0_28px_50px_rgba(88,70,12,0.22)] ${canAnimateIn ? "hero-card-settle" : ""}`}
              >
                <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[42px] ${canAnimateIn ? "hero-card-glow-enter" : ""}`}>
                  <div className="absolute inset-y-0 left-[-32%] w-[44%] -rotate-[18deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34),transparent)] blur-xl" />
                </div>
              <div className="absolute -left-8 top-10 h-[86%] w-full rounded-[42px] bg-[rgba(104,86,20,0.12)] blur-[2px]" />
              <div className="absolute inset-5 rounded-[34px] border border-[rgba(255,255,255,0.42)] bg-[linear-gradient(180deg,rgba(255,252,221,0.56),rgba(231,208,83,0.18))]" />
              <div
                ref={heroCardHighlightRef}
                className="absolute inset-x-10 top-12 h-24 rounded-[28px] bg-[rgba(255,255,255,0.32)] blur-xl"
              />

              <div
                ref={figureRef}
                className="absolute left-1/2 top-14 h-[280px] w-[190px] -translate-x-1/2"
              >
                <div className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 rounded-full bg-[#2b1e16] shadow-[0_10px_14px_rgba(0,0,0,0.18)]" />
                <div className="absolute left-[40px] top-5 h-8 w-8 rounded-full border-[7px] border-[#171717]" />
                <div className="absolute right-[40px] top-5 h-8 w-8 rounded-full border-[7px] border-[#171717]" />
                <div className="absolute left-1/2 top-14 h-16 w-12 -translate-x-1/2 rounded-b-[20px] rounded-t-[12px] bg-[#8b5b3c]" />
                <div className="absolute left-[82px] top-[22px] h-1.5 w-1.5 rounded-full bg-[#140e0c]" />
                <div className="absolute right-[82px] top-[22px] h-1.5 w-1.5 rounded-full bg-[#140e0c]" />
                <div className="absolute left-1/2 top-[30px] h-6 w-7 -translate-x-1/2 rounded-b-[14px] rounded-t-[4px] bg-[#1f130d]" />
                <div className="absolute left-1/2 top-[42px] h-2 w-5 -translate-x-1/2 rounded-full border-b-2 border-[#6a3925]" />
                <div className="absolute left-1/2 top-[74px] h-[128px] w-[120px] -translate-x-1/2 rounded-[30px] bg-[#1850be] shadow-[inset_0_-14px_24px_rgba(4,21,59,0.28)]" />
                <div className="absolute left-1/2 top-[82px] h-[44px] w-2 -translate-x-[18px] rounded-full bg-[#0d327d]" />
                <div className="absolute left-1/2 top-[82px] h-[44px] w-2 translate-x-[16px] rounded-full bg-[#0d327d]" />
                <div className="absolute left-1/2 top-[138px] h-12 w-[54px] -translate-x-1/2 rounded-[20px] bg-[#1548aa]" />
                <div className="absolute left-[37px] top-[90px] h-[86px] w-11 rotate-[15deg] rounded-full bg-[#1850be]" />
                <div className="absolute right-[37px] top-[90px] h-[86px] w-11 -rotate-[15deg] rounded-full bg-[#1850be]" />
                <div className="absolute left-[60px] top-[180px] h-[112px] w-12 rotate-[3deg] rounded-full bg-[#1b1b1b]" />
                <div className="absolute right-[60px] top-[180px] h-[112px] w-12 -rotate-[3deg] rounded-full bg-[#222]" />
                <div className="absolute left-[52px] top-[276px] h-7 w-14 -rotate-[8deg] rounded-[18px] bg-[#f4ede1] shadow-[0_8px_16px_rgba(0,0,0,0.16)] before:absolute before:left-3 before:top-2 before:h-1 before:w-6 before:rounded-full before:bg-[#d2a068]" />
                <div className="absolute right-[52px] top-[276px] h-7 w-14 rotate-[8deg] rounded-[18px] bg-[#f4ede1] shadow-[0_8px_16px_rgba(0,0,0,0.16)] before:absolute before:right-3 before:top-2 before:h-1 before:w-6 before:rounded-full before:bg-[#d2a068]" />
                <div className="absolute left-1/2 top-[302px] h-4 w-[140px] -translate-x-1/2 rounded-full bg-[rgba(54,41,9,0.18)] blur-md" />
              </div>

              <div
                ref={rightFloatRef}
                className="absolute -right-12 bottom-14 w-[210px] rounded-[28px] border border-[rgba(76,61,14,0.18)] bg-[rgba(255,247,189,0.86)] p-5 shadow-[0_24px_40px_rgba(88,70,12,0.18)] backdrop-blur"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(43,35,8,0.56)]">
                  <Layers3 className="size-4" />
                  Layer system
                </div>
                <p className="mt-3 text-2xl font-semibold leading-tight">
                  Poster graphics
                  <br />
                  with lift
                </p>
                <p className="mt-3 text-sm leading-6 text-[rgba(43,35,8,0.72)]">
                  Cards and figure blocks hover above the grid so the page feels assembled,
                  not merely drawn.
                </p>
              </div>

              <div
                ref={leftFloatRef}
                className="absolute -left-12 top-[52%] w-[180px] rounded-[24px] border border-[rgba(76,61,14,0.18)] bg-[rgba(255,251,223,0.9)] p-4 shadow-[0_20px_34px_rgba(88,70,12,0.15)] backdrop-blur"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(43,35,8,0.56)]">
                  <Star className="size-4" />
                  Signature move
                </div>
                <p className="mt-2 text-sm leading-6 text-[rgba(43,35,8,0.78)]">
                  Big background lettering anchors the composition while the foreground
                  character creates instant focus.
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="relative z-20 mt-8 grid gap-6 border-t border-[rgba(93,78,19,0.24)] pt-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat, index) => (
              <article
                key={stat.label}
                ref={(element) => {
                  statsRefs.current[index] = element;
                }}
                className="rounded-[30px] border border-[rgba(77,63,14,0.18)] bg-[rgba(255,248,198,0.76)] px-5 py-6 shadow-[0_16px_28px_rgba(88,70,12,0.08)] backdrop-blur"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[rgba(43,35,8,0.48)]">
                  design note
                </div>
                <div className="mt-3 font-[var(--font-display)] text-4xl tracking-[-0.06em]">{stat.value}</div>
                <div className="mt-2 text-sm uppercase tracking-[0.18em] text-[rgba(43,35,8,0.62)]">
                  {stat.label}
                </div>
                <p className="mt-4 text-sm leading-6 text-[rgba(43,35,8,0.7)]">{stat.note}</p>
              </article>
            ))}
          </div>

          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-sm text-[rgba(43,35,8,0.7)]">Reach out</div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {socialLinks.map(({ label, handle, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="inline-flex items-center gap-3 rounded-[22px] border border-[rgba(77,63,14,0.26)] bg-[rgba(255,248,198,0.88)] px-4 py-3 shadow-[0_14px_24px_rgba(88,70,12,0.09)]"
                  >
                    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.58)]">
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs uppercase tracking-[0.18em] text-[rgba(43,35,8,0.52)]">
                        {handle}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <a
              href="#ideas"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(77,63,14,0.26)] bg-[rgba(29,23,6,0.95)] px-5 py-3 text-sm font-medium text-[#fff6cf] shadow-[0_16px_28px_rgba(37,29,7,0.18)]"
            >
              Scroll for layers
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <section
        id="ideas"
        data-snap-section
        className="relative mx-auto w-full max-w-[1600px] px-6 pb-16 sm:px-10 lg:px-16 lg:pb-24"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {stackCards.map((card, index) => (
            <article
              key={card.title}
              ref={(element) => {
                ideaRefs.current[index] = element;
              }}
              className="relative overflow-hidden rounded-[34px] border border-[rgba(77,63,14,0.18)] bg-[rgba(255,248,198,0.72)] p-7 shadow-[0_22px_32px_rgba(88,70,12,0.09)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.3),transparent_42%)] opacity-70" />
              <div className="relative">
                <div className="inline-flex rounded-full border border-[rgba(77,63,14,0.18)] bg-[rgba(255,255,255,0.35)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(43,35,8,0.56)]">
                  {card.eyebrow}
                </div>
                <h2 className="mt-4 font-[var(--font-display)] text-3xl leading-tight tracking-[-0.05em]">
                  {card.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[rgba(43,35,8,0.72)]">{card.text}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-12 flex flex-col gap-4 border-t border-[rgba(93,78,19,0.24)] pt-6 text-sm text-[rgba(43,35,8,0.64)] sm:flex-row sm:items-center sm:justify-between">
          <span>Designed from your visual reference</span>
          <span>Made as a live Next.js concept in this workspace</span>
        </footer>
      </section>
    </main>
  );
}

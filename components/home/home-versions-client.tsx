"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Link } from "@/components/ui/link";
import { ArrowLeft, ArrowRight } from "@/components/ui/pixel-icons";

export interface StageLook {
  alt: string;
  color: string;
  href: string;
  src: string;
  swatch: string;
}

export interface StageItem {
  breaks: { min: number; price: string }[];
  handle: string;
  label: string;
  looks: StageLook[];
  title: string;
}

interface StageCycleProps {
  className?: string;
  items: StageItem[];
}

const FADE_EDGES = {
  maskComposite: "intersect",
  maskImage:
    "linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 4%, black 80%, transparent)",
} as const;

const ARROW_CLASS =
  "absolute top-1/2 z-10 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-card/85 text-foreground shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-border backdrop-blur transition-transform hover:scale-105 active:scale-95";

// Every look of every product in one loop: colors first, then the next person.
// Arrows and a horizontal swipe move to the previous or next person; the swatches pick a color.
export function StageCycle({ className, items }: StageCycleProps) {
  const order = items.flatMap((item, product) => item.looks.map((_, look) => ({ look, product })));
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [swipeFrom, setSwipeFrom] = useState<number | null>(null);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setStep((index) => (index + 1) % order.length), 3600);
    return () => window.clearInterval(timer);
  }, [order.length, paused]);
  const current = order[step] ?? { look: 0, product: 0 };
  const item = items[current.product];
  const look = item?.looks[current.look];
  const jump = (product: number, lookIndex: number) =>
    setStep(order.findIndex((entry) => entry.product === product && entry.look === lookIndex));
  const move = (by: number) => jump((current.product + by + items.length) % items.length, 0);
  if (!item || !look) return null;
  return (
    <>
      <div
        className={`${className ?? ""} touch-pan-y select-none`}
        onPointerCancel={() => setSwipeFrom(null)}
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("button")) setSwipeFrom(event.clientX);
        }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => {
          setPaused(false);
          setSwipeFrom(null);
        }}
        onPointerUp={(event) => {
          if (swipeFrom === null) return;
          const distance = event.clientX - swipeFrom;
          setSwipeFrom(null);
          if (Math.abs(distance) > 48) move(distance < 0 ? 1 : -1);
        }}
      >
        <div className="pointer-events-none absolute inset-0" style={FADE_EDGES}>
          {items.flatMap((entry, product) =>
            entry.looks.map((image, index) => {
              const active = product === current.product && index === current.look;
              return (
                <Image
                  key={image.src}
                  alt={image.alt}
                  aria-hidden={active ? undefined : true}
                  className="object-cover object-[50%_20%] opacity-0 transition-opacity duration-700 ease-out data-[active=true]:opacity-100"
                  data-active={active}
                  draggable={false}
                  fill
                  priority={product === 0 && index === 0}
                  sizes="100vw"
                  src={image.src}
                />
              );
            }),
          )}
        </div>
        <button
          aria-label="Previous person"
          className={`${ARROW_CLASS} left-2 sm:left-6`}
          onClick={() => move(-1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </button>
        <button
          aria-label="Next person"
          className={`${ARROW_CLASS} right-2 sm:right-6`}
          onClick={() => move(1)}
          type="button"
        >
          <ArrowRight aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </button>
        <div className="absolute inset-x-0 bottom-3 flex flex-wrap items-center justify-center gap-1 px-4">
          {item.looks.map((entry, index) => (
            <button
              key={entry.color}
              aria-label={`Show ${entry.color}`}
              aria-pressed={index === current.look}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-background/70 py-1 pr-3 pl-1 font-mono text-xxs tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase backdrop-blur transition-colors aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:ring-1 aria-pressed:ring-foreground"
              onClick={() => jump(current.product, index)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="size-4 rounded-full border border-foreground/15"
                style={{ background: entry.swatch }}
              />
              {entry.color}
            </button>
          ))}
        </div>
      </div>
      <div
        className="grid content-center gap-4 rounded-2xl bg-card p-5"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="grid gap-1">
          <p className="font-mono text-xxs tracking-[0.16em] text-muted-foreground uppercase">
            {String(current.product + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </p>
          <p className="font-pixel text-xl leading-none tracking-wide uppercase">{item.title}</p>
          <p className="font-mono text-xxs tracking-[0.16em] text-muted-foreground uppercase">
            {look.color} · per piece
          </p>
        </div>
        <ul className="grid">
          {item.breaks.map((tier) => (
            <li
              key={tier.min}
              className="flex items-baseline justify-between border-b border-border py-2 last:border-0"
            >
              <span className="font-mono text-xs tracking-[0.12em] uppercase">{tier.min}+ pcs</span>
              <span className="font-pixel text-2xl leading-none">{tier.price}</span>
            </li>
          ))}
        </ul>
        <Link
          className="inline-flex h-[var(--btn-h,3rem)] items-center justify-center rounded-[var(--btn-r,0.5rem)] bg-foreground px-5 font-mono text-xs tracking-[0.14em] text-background uppercase transition-opacity hover:opacity-85"
          href={look.href}
        >
          View {item.label}
        </Link>
      </div>
    </>
  );
}

const PRESETS = [
  { height: 40, label: "Small", radius: 6 },
  { height: 48, label: "Medium", radius: 8 },
  { height: 56, label: "Large", radius: 12 },
  { height: 48, label: "Pill", radius: 999 },
];
const STORE = "merchwell-button-tuning";

// The panel starts closed, so restoring saved values here never changes the server-rendered markup.
function readTuning(): { height: number; radius: number } {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) ?? "null") as {
      height: number;
      radius: number;
    } | null;
    if (saved) return saved;
  } catch {}
  return { height: 48, radius: 8 };
}

// Temporary design control for the homepage candidates: try button height and corner radius live.
export function ButtonTuner() {
  const [open, setOpen] = useState(false);
  const [saved] = useState(readTuning);
  const [height, setHeight] = useState(saved.height);
  const [radius, setRadius] = useState(saved.radius);
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--btn-h", `${height}px`);
    root.setProperty("--btn-r", `${radius}px`);
    try {
      window.localStorage.setItem(STORE, JSON.stringify({ height, radius }));
    } catch {}
  }, [height, radius]);
  return (
    <div className="fixed right-24 bottom-5 z-40 hidden justify-items-end gap-2 md:grid">
      {open ? (
        <div className="grid w-64 gap-4 rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                aria-pressed={preset.height === height && preset.radius === radius}
                className="cursor-pointer rounded-full border border-foreground/15 px-2.5 py-1 font-mono text-xxs tracking-[0.12em] uppercase aria-pressed:bg-foreground aria-pressed:text-background"
                onClick={() => {
                  setHeight(preset.height);
                  setRadius(preset.radius);
                }}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="grid gap-1.5 font-mono text-xxs tracking-[0.12em] uppercase">
            <span className="flex justify-between">
              Height <span>{height}px</span>
            </span>
            <input
              className="accent-foreground"
              max={64}
              min={36}
              onChange={(event) => setHeight(Number(event.target.value))}
              type="range"
              value={height}
            />
          </label>
          <label className="grid gap-1.5 font-mono text-xxs tracking-[0.12em] uppercase">
            <span className="flex justify-between">
              Corner radius <span>{radius >= 999 ? "pill" : `${radius}px`}</span>
            </span>
            <input
              className="accent-foreground"
              max={32}
              min={0}
              onChange={(event) => setRadius(Number(event.target.value))}
              type="range"
              value={Math.min(radius, 32)}
            />
          </label>
        </div>
      ) : null}
      <button
        aria-expanded={open}
        className="h-10 cursor-pointer rounded-xl bg-[#040404] px-4 font-mono text-xxs tracking-[0.12em] text-white uppercase shadow-xl"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Close" : "Buttons"}
      </button>
    </div>
  );
}

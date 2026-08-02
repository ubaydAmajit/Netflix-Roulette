"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WheelSegment } from "@/lib/types";
const R_OUTER = 98;
const R_INNER = 30;
const GAP_DEG = 0.7;
const VELOCITY = 118;
const IDLE_VELOCITY = 5;
const MIN_SPIN_MS = 1300;
const LAND_MS = 3400;
const LAND_TURNS = 3;
type Phase = "idle" | "spinning" | "landing";
type Props = {
    segments: WheelSegment[];
    spinToken: number;
    winner: WheelSegment | null;
    abortToken: number;
    onLanded: () => void;
    onSpin: () => void;
    isSpinning: boolean;
    onSelect?: (segment: WheelSegment) => void;
};
/** Wheel rendering and spin animation. */
function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}
function point(radius: number, deg: number): [
    number,
    number
] {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [round(radius * Math.cos(rad)), round(radius * Math.sin(rad))];
}
function sectorPath(deg: number, segmentDeg: number): string {
    const half = segmentDeg / 2 - GAP_DEG / 2;
    const [ox1, oy1] = point(R_OUTER, deg - half);
    const [ox2, oy2] = point(R_OUTER, deg + half);
    const [ix2, iy2] = point(R_INNER, deg + half);
    const [ix1, iy1] = point(R_INNER, deg - half);
    const large = segmentDeg > 180 ? 1 : 0;
    return [
        `M ${ox1} ${oy1}`,
        `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${ox2} ${oy2}`,
        `L ${ix2} ${iy2}`,
        `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${ix1} ${iy1}`,
        "Z",
    ].join(" ");
}
function artBox(deg: number, segmentDeg: number) {
    const mid = (R_OUTER + R_INNER) / 2;
    const [cx, cy] = point(mid, deg);
    const width = round(2 * R_OUTER * Math.sin((segmentDeg * Math.PI) / 360) * 1.55);
    const height = round((R_OUTER - R_INNER) * 1.3);
    return { x: round(cx - width / 2), y: round(cy - height / 2), width, height, cx, cy };
}
const LABEL_RADIUS = R_OUTER * 0.72;
function labelTransform(deg: number, cx: number, cy: number): string {
    const flipped = deg > 90 && deg < 270;
    return `rotate(${round(flipped ? deg - 180 : deg)} ${cx} ${cy})`;
}
function prefersReducedMotion(): boolean {
    return (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
export default function SpinWheel({ segments, spinToken, winner, abortToken, onLanded, onSpin, isSpinning, onSelect, }: Props) {
    const rotorRef = useRef<SVGGElement>(null);
    const angleRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const lastTsRef = useRef<number | null>(null);
    const startedAtRef = useRef(0);
    const [phase, setPhase] = useState<Phase>("idle");
    const count = Math.max(segments.length, 1);
    const segmentDeg = 360 / count;
    const [winnerSlot, setWinnerSlot] = useState(0);
    const seats = useMemo(() => {
        const slots: Array<WheelSegment | null> = Array.from({ length: count }, (_, i) => segments.length > 0 ? segments[i % segments.length] : null);
        if (winner)
            slots[winnerSlot % count] = winner;
        return slots;
    }, [segments, winner, winnerSlot, count]);
    const geometry = useMemo(() => Array.from({ length: count }, (_, i) => {
        const deg = i * segmentDeg;
        const [lx, ly] = point(LABEL_RADIUS, deg);
        return {
            deg,
            path: sectorPath(deg, segmentDeg),
            art: artBox(deg, segmentDeg),
            label: { x: lx, y: ly },
        };
    }), [count, segmentDeg]);
    const write = (deg: number) => {
        if (rotorRef.current)
            rotorRef.current.style.transform = `rotate(${deg}deg)`;
    };
    const countRef = useRef(count);
    countRef.current = count;
    useEffect(() => {
        if (spinToken === 0)
            return;
        setWinnerSlot(Math.floor(Math.random() * countRef.current));
        startedAtRef.current = Date.now();
        if (rotorRef.current)
            rotorRef.current.style.transition = "";
        setPhase("spinning");
    }, [spinToken]);
    useEffect(() => {
        if (abortToken === 0)
            return;
        if (rotorRef.current)
            rotorRef.current.style.transition = "";
        setPhase("idle");
    }, [abortToken]);
    useEffect(() => {
        if (phase === "landing")
            return;
        const speed = phase === "spinning" ? VELOCITY : IDLE_VELOCITY;
        if (speed === IDLE_VELOCITY && prefersReducedMotion())
            return;
        const tick = (ts: number) => {
            const last = lastTsRef.current;
            lastTsRef.current = ts;
            if (last !== null) {
                angleRef.current += (speed * (ts - last)) / 1000;
                write(angleRef.current);
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null)
                cancelAnimationFrame(rafRef.current);
            lastTsRef.current = null;
        };
    }, [phase]);
    const settle = useCallback(() => {
        setPhase("idle");
        onLanded();
    }, [onLanded]);
    useEffect(() => {
        if (!winner || phase !== "spinning")
            return;
        const desired = -(winnerSlot % count) * segmentDeg;
        if (prefersReducedMotion()) {
            angleRef.current = desired;
            write(desired);
            settle();
            return;
        }
        const wait = Math.max(0, MIN_SPIN_MS - (Date.now() - startedAtRef.current));
        const timer = window.setTimeout(() => {
            if (!rotorRef.current) {
                settle();
                return;
            }
            if (rafRef.current !== null)
                cancelAnimationFrame(rafRef.current);
            const current = angleRef.current;
            const delta = (((desired - current) % 360) + 360) % 360;
            const target = current + delta + 360 * LAND_TURNS;
            write(current);
            angleRef.current = target;
            requestAnimationFrame(() => {
                if (!rotorRef.current)
                    return;
                rotorRef.current.style.transition = `transform ${LAND_MS}ms cubic-bezier(0.09, 0.72, 0.11, 1)`;
                write(target);
                setPhase("landing");
            });
        }, wait);
        return () => window.clearTimeout(timer);
    }, [winner, phase, winnerSlot, count, segmentDeg, settle]);
    const onTransitionEnd = (event: React.TransitionEvent) => {
        if (event.propertyName === "transform" && phase === "landing")
            settle();
    };
    const busy = isSpinning || phase !== "idle";
    const landed = phase === "landing" || (phase === "idle" && winner !== null);
    const interactive = Boolean(onSelect) && !busy;
    return (<div className={`wheel-stage phase-${phase}`}>
      
      <button type="button" className="wheel-hub" onClick={onSpin} disabled={busy} aria-label={landed ? "Spin again" : "Spin the roulette"}>
        {busy ? (<span className="spinner"/>) : (<>
            <span className="hub-glyph" aria-hidden="true">
              🎲
            </span>
            <span className="hub-label">SPIN</span>
          </>)}
      </button>

      <div className="wheel-pointer" aria-hidden="true"/>

      <svg className="wheel" viewBox="-100 -100 200 200" role="presentation">
        <defs>
          {geometry.map((segment, index) => (<clipPath id={`nf-seg-${index}`} key={index}>
              <path d={segment.path}/>
            </clipPath>))}
          <radialGradient id="nf-depth" cx="50%" cy="50%" r="50%">
            <stop offset="42%" stopColor="#000" stopOpacity="0.55"/>
            <stop offset="72%" stopColor="#000" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0.4"/>
          </radialGradient>
        </defs>

        <circle className="wheel-bezel" r={R_OUTER + 1.5}/>

        <g className="wheel-rotor" ref={rotorRef} onTransitionEnd={onTransitionEnd} pointerEvents={busy ? "none" : "auto"}>
          {geometry.map((segment, index) => {
            const item = seats[index];
            const isWinner = index === winnerSlot % count && landed;
            const clickable = interactive && Boolean(item);
            return (<g key={index} className={`seg${isWinner ? " is-winner" : ""}${clickable ? " is-clickable" : ""}`} onClick={clickable && item ? () => onSelect?.(item) : undefined} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined} aria-label={clickable ? (item?.label ?? undefined) : undefined} onKeyDown={(event) => {
                    if (!clickable || !item)
                        return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect?.(item);
                    }
                }}>
                <g clipPath={`url(#nf-seg-${index})`}>
                  
                  <path className="seg-bed" d={segment.path} style={!item?.posterUrl && item?.hue !== undefined
                    ? { fill: `hsl(${item.hue} 55% 32%)` }
                    : undefined}/>
                  {item?.posterUrl ? (<image href={item.posterUrl} x={segment.art.x} y={segment.art.y} width={segment.art.width} height={segment.art.height} transform={`rotate(${segment.deg} ${segment.art.cx} ${segment.art.cy})`} preserveAspectRatio="xMidYMid slice"/>) : null}
                </g>

                {!item?.posterUrl && item?.label ? (<text className="seg-label" x={segment.label.x} y={segment.label.y} transform={labelTransform(segment.deg, segment.label.x, segment.label.y)} textAnchor="middle" dominantBaseline="central">
                    {item.label}
                  </text>) : null}

                <path className="seg-edge" d={segment.path}/>
              </g>);
        })}

          <circle className="wheel-depth" r={R_OUTER} fill="url(#nf-depth)"/>
        </g>
      </svg>
    </div>);
}

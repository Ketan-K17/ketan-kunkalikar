import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "./tear-off.css";

/**
 * The old portfolio as a paper cover over the Mac. A pull-tab hangs from the top of the page; pulling it (or
 * clicking it) rips the page down the middle, the two halves fall away, and the Mac (src/laptop) boots underneath.
 * Shut Down on the Mac puts the cover back.
 *
 * The halves are static clones of the page, clipped along a jagged line, so the real React tree is never touched.
 */

type Phase = "cover" | "tearing" | "gone";

/** Pulling the tab this far (px) commits the tear; a plain click does too. */
const COMMIT_PX = 36;
const RIP_MS = 520;
const FALL_MS = 1150;

const loadMac = () => import("@/laptop/MacScreen");

interface Piece {
  root: HTMLElement;
  rim: HTMLElement;
  clip: HTMLElement;
}

/** A tear line from the tab at `x0`: a gentle random walk down the page plus small zigzag teeth, in viewport px. */
function tearLine(w: number, h: number, x0: number) {
  const pts: { x: number; y: number; rim: number }[] = [];
  const step = 12;
  let x = x0;
  let drift = 0;
  for (let y = 0; y <= h + step; y += step) {
    drift = Math.max(-1.6, Math.min(1.6, drift + (Math.random() - 0.5) * 0.9));
    x = Math.max(w * 0.3, Math.min(w * 0.7, x + drift * 3));
    pts.push({ x: x + (Math.random() - 0.5) * 7, y: Math.min(y, h + step), rim: 1.5 + Math.random() * 3 });
  }
  return pts;
}

export default function TearOff({ children }: { children: ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  const flap = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("cover");
  const drag = useRef<{ id: number; y0: number; moved: boolean } | null>(null);
  const scrollY = useRef(0);

  // Fetch the Mac while the visitor reads the old site, so the tear never waits on the network.
  useEffect(() => {
    const t = window.setTimeout(() => void loadMac(), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const putBack = useCallback(() => {
    document.documentElement.classList.remove("tear-locked");
    setPhase("cover");
    requestAnimationFrame(() => window.scrollTo(0, scrollY.current));
  }, []);

  const tear = useCallback(async () => {
    const page = sheet.current;
    if (!page || phase !== "cover") return;
    setPhase("tearing");
    const { macScreen } = await loadMac();

    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    scrollY.current = window.scrollY;
    const fr = flap.current?.getBoundingClientRect();
    const fx = fr ? fr.left + fr.width / 2 : w / 2;
    const line = tearLine(w, h, fx);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sticky things (the nav) are wherever scrolling left them; a clone outside the scroller would put them back at
    // the top of the page, so note how far each one is stuck.
    const live = [...page.querySelectorAll<HTMLElement>("*")];
    const stuck = new Map<number, number>();
    live.forEach((n, i) => {
      if (getComputedStyle(n).position !== "sticky") return;
      const at = n.getBoundingClientRect().top;
      n.style.position = "relative";
      stuck.set(i, at - n.getBoundingClientRect().top);
      n.style.position = "";
    });

    // Two halves, each a clipped clone of the page as it is on screen right now.
    const make = (side: "left" | "right"): Piece => {
      const copy = page.cloneNode(true) as HTMLElement;
      const all = copy.querySelectorAll<HTMLElement>("*");
      for (const [i, dy] of stuck) Object.assign(all[i].style, { position: "relative", top: `${dy}px` });
      copy.removeAttribute("id");
      copy.classList.add("tear-copy");
      copy.style.top = `${-scrollY.current}px`;
      copy.style.width = `${w}px`;
      copy.setAttribute("aria-hidden", "true");
      const clip = document.createElement("div");
      clip.className = "tear-clip";
      clip.append(copy);
      const rim = document.createElement("div");
      rim.className = "tear-rim";
      const root = document.createElement("div");
      root.className = `tear-piece ${side}`;
      root.append(rim, clip);
      document.body.append(root);
      return { root, rim, clip };
    };
    const left = make("left");
    const right = make("right");

    // The cover's own elements go; the Mac opens beneath the halves.
    document.documentElement.classList.add("tear-locked");
    page.style.visibility = "hidden";
    macScreen().open(() => {
      page.style.visibility = "";
      putBack();
    });

    /** Clip both halves for a rip that has reached `tip` px down the page. The gap is widest at the top. */
    const shape = (tip: number) => {
      const open = Math.min(46, 10 + tip * 0.06);
      const pts = line.filter((p) => p.y < tip);
      const end = line.find((p) => p.y >= tip) ?? line[line.length - 1];
      const gap = (y: number) => open * Math.pow(1 - y / Math.max(tip, 1), 0.85);
      const edge = (dir: -1 | 1, rim: boolean) => pts.map((p) => `${p.x + dir * (gap(p.y) - (rim ? p.rim : 0))}px ${p.y}px`);
      const tipPt = `${end.x}px ${tip}px`;
      const leftPoly = (rim: boolean) => `polygon(0 0, ${[...edge(-1, rim), tipPt].join(", ")}, ${w}px ${tip}px, ${w}px ${h}px, 0 ${h}px)`;
      const rightPoly = (rim: boolean) => `polygon(${[...edge(1, rim), tipPt].join(", ")}, ${w}px ${tip}px, ${w}px 0)`;
      left.clip.style.clipPath = leftPoly(false);
      left.rim.style.clipPath = leftPoly(true);
      right.clip.style.clipPath = rightPoly(false);
      right.rim.style.clipPath = rightPoly(true);
      if (flap.current) flap.current.style.transform = `translate(${end.x - fx}px, ${tip}px) rotate(${(end.x - fx) * 0.05}deg)`;
    };

    const finish = () => {
      left.root.remove();
      right.root.remove();
      setPhase("gone");
    };

    if (reduced) {
      shape(h + 20);
      for (const p of [left, right]) p.root.classList.add("fade");
      window.setTimeout(finish, 400);
      return;
    }

    // Rip down the page, quickly at first and slowing as it reaches the bottom.
    const t0 = performance.now();
    const rip = (now: number) => {
      const k = Math.min(1, (now - t0) / RIP_MS);
      shape(24 + (h + 20 - 24) * (1 - Math.pow(1 - k, 2.2)));
      if (k < 1) return requestAnimationFrame(rip);
      // Then each half drops away, falling outwards.
      for (const p of [left, right]) p.root.classList.add("fall");
      window.setTimeout(finish, FALL_MS + 120);
    };
    requestAnimationFrame(rip);
  }, [phase, putBack]);

  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase !== "cover") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, y0: e.clientY, moved: false };
    void loadMac();
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = Math.max(0, e.clientY - d.y0);
    if (dy > 4) d.moved = true;
    // The tab stretches as it is tugged, with growing resistance, then gives.
    e.currentTarget.style.transform = `translateY(${Math.min(COMMIT_PX, dy * 0.7)}px) scaleY(${1 + Math.min(dy, COMMIT_PX) / 220})`;
    if (dy * 0.7 >= COMMIT_PX) {
      drag.current = null;
      void tear();
    }
  };
  const onUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    e.currentTarget.style.transform = "";
    // A click (or a short tug) still tears it: the tab is the only thing it does.
    void tear();
  };

  return (
    <>
      <div ref={sheet} className={`tear-sheet${phase === "gone" ? " gone" : ""}`}>
        {children}
      </div>
      {phase !== "gone" && (
        <div className={`tear-top${phase === "tearing" ? " tearing" : ""}`}>
          <div className="tear-perf" aria-hidden="true" />
          <button
            ref={flap}
            type="button"
            className="tear-flap"
            aria-label="Tear off this page to open the new portfolio"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), void tear())}
          >
            <span className="tear-flap-grip" aria-hidden="true" />
            <span className="tear-flap-text">pull</span>
            <span className="tear-flap-arrow" aria-hidden="true">↓</span>
          </button>
        </div>
      )}
    </>
  );
}

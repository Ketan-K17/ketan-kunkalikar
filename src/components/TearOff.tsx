import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "./tear-off.css";
import { playFall, playRip, primeTearSound, type RipBurst } from "./tear-sound";

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
/** Gravity for the falling halves, px/s². */
const GRAVITY = 2600;
/** A half lets go of the bottom edge once it has leaned this far (radians) and falls free. */
const RELEASE_RAD = 0.32;

const loadMac = () => import("@/laptop/MacScreen");

interface Piece {
  root: HTMLElement;
  rim: HTMLElement;
  clip: HTMLElement;
}

/** A spurt of tearing: from `t` ms for `dur` ms, the rip runs from fraction `p0` to `p1` of the page. */
interface Spurt {
  t: number;
  dur: number;
  p0: number;
  p1: number;
}

/**
 * Paper doesn't rip at an even speed: it snaps at the perforation, catches, then gives way in a few spurts.
 * Returns the spurts and the total time, in ms.
 */
function ripPlan() {
  const spurts: Spurt[] = [{ t: 0, dur: 80, p0: 0, p1: 0.05 + Math.random() * 0.04 }];
  let t = 80 + 120 + Math.random() * 60;
  let p = spurts[0].p1;
  const parts = [0.42, 0.33, 0.25].map((f) => f * (0.8 + Math.random() * 0.4));
  const sum = parts.reduce((a, b) => a + b, 0);
  parts.forEach((f, i) => {
    const to = i === parts.length - 1 ? 1 : p + ((1 - spurts[0].p1) * f) / sum;
    const dur = 50 + (to - p) * 480;
    spurts.push({ t, dur, p0: p, p1: to });
    t += dur + 35 + Math.random() * 60;
    p = to;
  });
  const last = spurts[spurts.length - 1];
  return { spurts, total: last.t + last.dur };
}

/** How far the rip has got at `ms`, 0 to 1, and how hard it is tearing right now (0 between spurts). */
function ripAt(spurts: Spurt[], ms: number) {
  let p = 0;
  for (const s of spurts) {
    if (ms < s.t) break;
    const u = Math.min(1, (ms - s.t) / s.dur);
    p = s.p0 + (s.p1 - s.p0) * (1 - Math.pow(1 - u, 2));
    if (u < 1) return { p, force: 1 - u };
  }
  return { p, force: 0 };
}

/** A scrap of paper fibre shaken loose by the rip. */
interface Fleck {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  phase: number;
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

    // The cover's own elements go; the Mac's wallpaper shows through the rip, and its desktop assembles once
    // the halves have let go.
    document.documentElement.classList.add("tear-locked");
    page.style.visibility = "hidden";
    const open = (ready: Promise<void>) =>
      macScreen().open(() => {
        page.style.visibility = "";
        putBack();
      }, ready);

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

    // Scraps of paper that fly off the torn edge and drift down.
    const dust = document.createElement("div");
    dust.className = "tear-flecks";
    document.body.append(dust);
    const flecks: Fleck[] = [];
    const fleck = (x: number, y: number, kick = 1) => {
      if (flecks.length > 60) return;
      const el = document.createElement("i");
      const size = 3 + Math.random() * 7;
      el.style.width = `${size}px`;
      el.style.height = `${size * (0.4 + Math.random() * 0.8)}px`;
      dust.append(el);
      flecks.push({ el, x, y, vx: (Math.random() - 0.5) * 260 * kick, vy: (-40 - Math.random() * 120) * kick, r: Math.random() * 360, vr: (Math.random() - 0.5) * 900, phase: Math.random() * 6 });
    };
    const moveFlecks = (dt: number, now: number) => {
      for (let i = flecks.length - 1; i >= 0; i--) {
        const f = flecks[i];
        // Light and draggy: they fall slowly and sway.
        f.vy = Math.min(220, f.vy + GRAVITY * 0.22 * dt);
        f.vx *= 1 - 1.8 * dt;
        f.x += (f.vx + Math.sin(now / 160 + f.phase) * 40) * dt;
        f.y += f.vy * dt;
        f.r += f.vr * dt;
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg) rotateX(${f.r * 1.7}deg)`;
        if (f.y > h + 20) {
          f.el.remove();
          flecks.splice(i, 1);
        }
      }
    };

    let released: () => void = () => {};
    const fallen = new Promise<void>((r) => (released = r));
    const finish = () => {
      left.root.remove();
      right.root.remove();
      dust.remove();
      setPhase("gone");
    };

    if (reduced) {
      // The Mac shows at once; the halves just fade.
      open(Promise.resolve());
      shape(h + 20);
      for (const p of [left, right]) p.root.classList.add("fade");
      window.setTimeout(finish, 400);
      return;
    }
    open(fallen);

    const { spurts, total } = ripPlan();
    playRip(spurts.map((sp, i): RipBurst => ({ at: sp.t / 1000, dur: sp.dur / 1000, amt: i === 0 ? 0.6 : 0.75 + Math.random() * 0.25 })));

    // Each half is a falling sheet hinged at its outer bottom corner: it leans out, gravity tips it over faster and
    // faster, then it lets go and tumbles away, swinging in 3D as it catches the air.
    const halves = [left, right].map((p, i) => ({
      p,
      dir: i === 0 ? -1 : 1,
      lean: 0,
      spin: 0.4,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      free: false,
      t: 0,
      delay: i === 0 ? 0 : 0.05 + Math.random() * 0.05,
      wobble: 0.9 + Math.random() * 0.4,
    }));
    const pose = (hv: (typeof halves)[number], jx = 0, jy = 0) => {
      const swing = hv.dir * Math.sin(hv.t * 5.2 * hv.wobble) * Math.min(22, hv.t * 40);
      const pitch = Math.sin(hv.t * 3.4 * hv.wobble + 1) * Math.min(14, hv.t * 26);
      hv.p.root.style.transform = `perspective(1600px) translate(${hv.x + jx}px, ${hv.y + jy}px) rotate(${hv.dir * hv.lean}rad) rotateY(${swing}deg) rotateX(${pitch}deg)`;
    };

    const t0 = performance.now();
    let last = t0;
    let ripping = true;
    let fallT0 = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveFlecks(dt, now);

      if (ripping) {
        const ms = now - t0;
        const { p, force } = ripAt(spurts, ms);
        const tip = 24 + (h + 20 - 24) * p;
        shape(tip);
        // The page shudders while it tears, and the halves start to sag apart.
        const shake = force * (ms < 100 ? 3 : 1.6);
        for (const hv of halves) {
          hv.lean = p * 0.025;
          pose(hv, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }
        const at = line.find((pt) => pt.y >= tip) ?? line[line.length - 1];
        if (force > 0 && Math.random() < 0.7) fleck(at.x, Math.min(tip, h - 4), ms < 100 ? 1.6 : 1);
        if (ms >= total) {
          ripping = false;
          fallT0 = now;
          shape(h + 20);
          for (let i = 0; i < 14; i++) {
            const pt = line[Math.floor(Math.random() * line.length)];
            fleck(pt.x, Math.min(pt.y, h - 4), 1.3);
          }
          playFall(0.05);
        }
        return requestAnimationFrame(frame);
      }

      const since = (now - fallT0) / 1000;
      let gone = true;
      for (const hv of halves) {
        if (since < hv.delay) {
          gone = false;
          continue;
        }
        hv.t += dt;
        if (!hv.free) {
          // A rod tipping over about its foot: angular acceleration grows with the lean.
          hv.spin += (0.6 + 7.5 * Math.sin(hv.lean)) * dt;
          hv.lean += hv.spin * dt;
          if (hv.lean > RELEASE_RAD) {
            hv.free = true;
            hv.vx = hv.dir * hv.spin * h * 0.35;
            hv.vy = hv.spin * w * 0.12 - 60;
          }
        } else {
          hv.vy += GRAVITY * dt;
          hv.vx *= 1 - 0.4 * dt;
          hv.x += hv.vx * dt;
          hv.y += hv.vy * dt;
          hv.spin *= 1 - 0.6 * dt;
          hv.lean += hv.spin * dt;
        }
        pose(hv);
        if (hv.y < h * 1.1) gone = false;
      }
      // Let the desktop assemble as soon as both halves are well on their way.
      if (halves.every((hv) => hv.free)) released();
      if (gone && since > 0.4) {
        released();
        // A few last scraps can finish drifting on their own.
        return window.setTimeout(finish, flecks.length ? 600 : 0);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [phase, putBack]);

  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase !== "cover") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    primeTearSound();
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
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), primeTearSound(), void tear())}
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

import { el } from './dom';

/** One glowing stream: a head that wanders around the middle of the screen, leaving a fading trail. */
interface Stream {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  phase: number;
  speed: number;
}

/**
 * Flurry, the Mac OS X screen saver from 10.2 to 10.8: coloured streams of light twisting out of the centre of a
 * black screen. Drawn on a canvas with additive blending; each frame fades the last one a little, which leaves
 * the trails. `start(canvas)` runs it in any canvas (the full screen or the preview in System Preferences).
 */
export class Flurry {
  private raf = 0;
  private streams: Stream[] = [];
  private t = 0;
  private frame = 0;

  start(canvas: HTMLCanvasElement) {
    this.stop();
    const g = canvas.getContext('2d')!;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    fit();
    g.fillStyle = '#000';
    g.fillRect(0, 0, canvas.width, canvas.height);
    this.streams = Array.from({ length: 5 }, (_, i) => ({ x: 0, y: 0, vx: 0, vy: 0, hue: (i * 72 + Math.random() * 40) % 360, phase: Math.random() * 10, speed: 0.6 + Math.random() * 0.5 }));
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 16.67;
      last = now;
      this.t += dt * 0.012;
      if (canvas.width !== Math.round(canvas.getBoundingClientRect().width * Math.min(2, devicePixelRatio || 1))) fit();
      this.draw(g, canvas.width, canvas.height, dt);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private draw(g: CanvasRenderingContext2D, W: number, H: number, dt: number) {
    g.globalCompositeOperation = 'source-over';
    // A slow fade leaves the trails. 8-bit colour never fades all the way to black that way, so every so often a
    // stronger pass wipes the grey smudge that would build up.
    this.frame++;
    g.fillStyle = `rgba(0,0,0,${(this.frame % 12 === 0 ? 0.22 : 0.06) * dt})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;
    const t = this.t;
    for (const s of this.streams) {
      s.hue = (s.hue + 0.25 * dt) % 360;
      // Lissajous-ish wandering, with a little turbulence, around a centre that also drifts.
      const p = t * s.speed + s.phase;
      const tx = cx + Math.sin(p * 1.3) * Math.cos(p * 0.7 + s.phase) * R + Math.sin(t * 0.5) * R * 0.15;
      const ty = cy + Math.cos(p * 1.1) * Math.sin(p * 0.9 - s.phase) * R * 0.8;
      s.vx += (tx - s.x) * 0.012 * dt;
      s.vy += (ty - s.y) * 0.012 * dt;
      s.vx *= 0.92;
      s.vy *= 0.92;
      const px = s.x || cx, py = s.y || cy;
      s.x = px + s.vx * dt;
      s.y = py + s.vy * dt;
      // A spray of short strands from the centre to the head: the "flurry" of fibres.
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2;
        const spread = (Math.min(W, H) / 120) * (1 + k);
        g.strokeStyle = `hsla(${(s.hue + k * 6) % 360}, 90%, ${55 + k * 4}%, ${0.05 + Math.random() * 0.05})`;
        g.lineWidth = Math.max(1, (Math.min(W, H) / 500) * (3 - k * 0.3));
        g.beginPath();
        g.moveTo(px + Math.cos(a) * spread, py + Math.sin(a) * spread);
        g.quadraticCurveTo(cx + (px - cx) * 0.5 + Math.sin(t * 3 + k) * spread * 4, cy + (py - cy) * 0.5 + Math.cos(t * 3 + k) * spread * 4, s.x + Math.cos(a + 1) * spread, s.y + Math.sin(a + 1) * spread);
        g.stroke();
      }
      const glow = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, Math.min(W, H) / 28);
      glow.addColorStop(0, `hsla(${s.hue}, 100%, 85%, 0.5)`);
      glow.addColorStop(1, `hsla(${s.hue}, 100%, 50%, 0)`);
      g.fillStyle = glow;
      g.fillRect(s.x - W / 20, s.y - W / 20, W / 10, W / 10);
    }
  }
}

/**
 * The full-screen screen saver over the laptop. It starts after `prefs.saverAfter` minutes without input while the
 * laptop is open; any key, click or real mouse movement stops it (that input is swallowed, like on a Mac).
 */
export class ScreenSaver {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private flurry = new Flurry();
  private startedAt = 0;
  private origin: { x: number; y: number } | null = null;

  constructor() {
    this.canvas = el('canvas', { class: 'saver-canvas' });
    this.el = el('div', { class: 'mac-saver' }, this.canvas);
    const stop = (e: Event) => {
      if (!this.isOn) return;
      e.preventDefault();
      // The laptop's own key handler is on window too, so stop it there and then.
      e.stopImmediatePropagation();
      this.stop();
    };
    this.el.addEventListener('pointerdown', stop);
    this.el.addEventListener('pointermove', (e) => {
      // A twitch of the mouse right after it starts shouldn't wake it.
      if (!this.origin) this.origin = { x: e.clientX, y: e.clientY };
      if (performance.now() - this.startedAt > 600 && Math.hypot(e.clientX - this.origin.x, e.clientY - this.origin.y) > 12) stop(e);
    });
    window.addEventListener('keydown', stop, true);
  }

  get isOn() {
    return this.el.classList.contains('on');
  }

  start() {
    if (this.isOn) return;
    this.startedAt = performance.now();
    this.origin = null;
    this.el.classList.add('on');
    this.flurry.start(this.canvas);
  }

  stop() {
    this.el.classList.remove('on');
    this.flurry.stop();
  }
}

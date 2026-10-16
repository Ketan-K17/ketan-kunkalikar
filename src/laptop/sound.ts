import { assets } from './assets';
import { prefs } from './prefs';

/**
 * Interface sounds for the laptop. Each event plays the owner's own file when `public/laptop/assets.json` lists
 * one, and otherwise a small synthesized stand-in, so the laptop is never silent. Loops (`window-move`,
 * `window-resize`) only play from files: a synthesized loop is more annoying than nothing.
 */
export type SoundName =
  | 'boot'
  | 'window-open'
  | 'window-close'
  | 'window-collapse'
  | 'window-expand'
  | 'window-zoom-max'
  | 'window-zoom-min'
  | 'window-move'
  | 'window-move-stop'
  | 'window-resize'
  | 'menu-open'
  | 'menu-close'
  | 'menu-hover'
  | 'menu-click'
  | 'button-down'
  | 'button-up'
  | 'click'
  | 'alert'
  | 'volume'
  | 'trash'
  | 'expose'
  | 'dashboard'
  | 'mail-sent';

const LOOPS = new Set<SoundName>(['window-move', 'window-resize']);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
let loaded: Promise<void> | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.connect(ctx.destination);
  applyVolume();
  return ctx;
}

/** Browsers only start audio after a user gesture; any key or tap counts, and pulling the tear-off tab is one. */
for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) {
  window.addEventListener(ev, () => void audio()?.resume().catch(() => {}), { capture: true, passive: true });
}

export function applyVolume() {
  if (master && ctx) master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.volume, ctx.currentTime, 0.02);
}

/** Fetches and decodes every sound file the owner provided. Safe to call often; it only runs once. */
export function preloadSounds() {
  loaded ??= (async () => {
    const c = audio();
    if (!c) return;
    const list = (await assets()).sounds;
    await Promise.all(
      Object.entries(list).map(async ([name, path]) => {
        try {
          const res = await fetch(import.meta.env.BASE_URL + 'laptop/' + path);
          if (!res.ok) throw new Error(String(res.status));
          buffers.set(name as SoundName, await c.decodeAudioData(await res.arrayBuffer()));
        } catch (e) {
          console.warn(`[laptop] sound "${name}" (${path}) failed to load; using the built-in one`, e);
        }
      }),
    );
  })();
  return loaded;
}

/** Every sound event, in the order the Sound preferences list them. */
export const SOUND_NAMES: SoundName[] = [
  'boot', 'window-open', 'window-close', 'window-collapse', 'window-expand', 'window-zoom-max', 'window-zoom-min',
  'window-move', 'window-move-stop', 'window-resize', 'menu-open', 'menu-close', 'menu-hover', 'menu-click',
  'button-down', 'button-up', 'click', 'alert', 'volume', 'trash', 'expose', 'dashboard', 'mail-sent',
];

export const hasFile = (name: SoundName) => buffers.has(name);
export const isLoop = (name: SoundName) => LOOPS.has(name);

/** Plays one sound. `gain` scales it (menu hover ticks are quieter than a window opening). */
export function play(name: SoundName, gain = 1) {
  if (!prefs.uiSounds && name !== 'boot' && name !== 'volume') return;
  const c = audio();
  if (!c || !master || c.state !== 'running') return;
  const buf = buffers.get(name);
  const out = c.createGain();
  out.gain.value = gain;
  out.connect(master);
  if (buf) {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(out);
    src.start();
    return;
  }
  if (!LOOPS.has(name)) SYNTH[name]?.(c, out, c.currentTime);
}

/** A sound that plays while something lasts (dragging a window). Returns a stop function. File-only. */
export function loop(name: SoundName): () => void {
  const c = audio();
  const buf = buffers.get(name);
  if (!prefs.uiSounds || !c || !master || !buf || c.state !== 'running') return () => {};
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  src.loop = true;
  src.connect(g).connect(master);
  g.gain.value = 0.6;
  src.start();
  return () => {
    g.gain.setTargetAtTime(0, c.currentTime, 0.03);
    src.stop(c.currentTime + 0.15);
  };
}

// ---------- Synthesized stand-ins ----------

type Synth = (c: AudioContext, out: AudioNode, t: number) => void;

function tone(c: AudioContext, out: AudioNode, t: number, freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, endFreq?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext, out: AudioNode, t: number, dur: number, vol: number, from: number, to = from, q = 1) {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = noiseBuf;
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const tick = (vol: number, freq = 3200): Synth => (c, out, t) => noise(c, out, t, 0.025, vol, freq, freq, 2);

const SYNTH: Partial<Record<SoundName, Synth>> = {
  // A warm major chord that swells and fades: the startup chime, in spirit.
  boot: (c, out, t) => {
    for (const [f, v] of [[174.6, 0.16], [261.6, 0.14], [349.2, 0.12], [440, 0.1], [523.3, 0.07], [698.5, 0.04]] as const) {
      const o = c.createOscillator();
      const o2 = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o2.type = 'sine';
      o.frequency.value = f;
      o2.frequency.value = f * 1.003;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.04);
      g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g);
      o2.connect(g);
      g.connect(out);
      o.start(t);
      o2.start(t);
      o.stop(t + 2.7);
      o2.stop(t + 2.7);
    }
  },
  'window-open': (c, out, t) => noise(c, out, t, 0.16, 0.22, 900, 4200, 1.4),
  'window-close': (c, out, t) => noise(c, out, t, 0.14, 0.2, 3800, 800, 1.4),
  'window-collapse': (c, out, t) => noise(c, out, t, 0.36, 0.24, 2600, 300, 1.2),
  'window-expand': (c, out, t) => noise(c, out, t, 0.32, 0.22, 300, 2600, 1.2),
  'window-zoom-max': (c, out, t) => noise(c, out, t, 0.18, 0.16, 1200, 3600, 1.6),
  'window-zoom-min': (c, out, t) => noise(c, out, t, 0.18, 0.16, 3600, 1200, 1.6),
  'window-move-stop': tick(0.12, 1400),
  'menu-open': tick(0.18, 2600),
  'menu-close': tick(0.1, 2000),
  'menu-hover': tick(0.05, 4200),
  'menu-click': (c, out, t) => {
    tick(0.2, 2400)(c, out, t);
    tone(c, out, t, 1900, 0.05, 'sine', 0.05);
  },
  'button-down': tick(0.22, 1800),
  'button-up': tick(0.14, 2600),
  click: tick(0.2, 2200),
  // Two quick metallic plinks, a little like an old alert sound.
  alert: (c, out, t) => {
    tone(c, out, t, 1320, 0.22, 'triangle', 0.2);
    tone(c, out, t + 0.11, 990, 0.3, 'triangle', 0.18);
  },
  volume: (c, out, t) => tone(c, out, t, 660, 0.08, 'sine', 0.3, 560),
  // A soft whoosh for Exposé, and a watery bloop for Dashboard (Tiger's widgets rippled in).
  expose: (c, out, t) => noise(c, out, t, 0.3, 0.14, 500, 1800, 0.9),
  dashboard: (c, out, t) => {
    tone(c, out, t, 420, 0.18, 'sine', 0.16, 900);
    tone(c, out, t + 0.06, 640, 0.22, 'sine', 0.1, 1300);
  },
  // Mail's whoosh as the message flies off.
  'mail-sent': (c, out, t) => noise(c, out, t, 0.5, 0.22, 400, 3800, 1.1),
  trash: (c, out, t) => {
    noise(c, out, t, 0.12, 0.25, 600, 300, 0.8);
    noise(c, out, t + 0.06, 0.2, 0.2, 2500, 900, 0.6);
  },
};

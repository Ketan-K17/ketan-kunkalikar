/**
 * Sounds for the tear-off cover, synthesized with WebAudio from filtered noise: the snap of the perforation, the
 * crackle of the rip (one burst per spurt of tearing) and the flutter of the halves falling. Kept apart from the
 * laptop's sound.ts so the cover doesn't load the Mac's chunk, but it honours the Mac's mute setting.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

const muted = () => {
  try {
    const p = JSON.parse(localStorage.getItem("laptop-prefs") ?? "{}");
    return p.muted === true || p.volume === 0;
  } catch {
    return false;
  }
};

/** Call from a pointerdown or keydown: browsers only start audio inside a user gesture. */
export function primeTearSound() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: "interactive" });
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  void ctx.resume().catch(() => {});
}

function ready() {
  return ctx && noise && ctx.state === "running" && !muted() ? { c: ctx, buf: noise } : null;
}

function source(c: AudioContext, buf: AudioBuffer, at: number, dur: number) {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start(at, Math.random() * 1.5);
  src.stop(at + dur + 0.05);
  return src;
}

export interface RipBurst {
  /** Start, seconds from now. */
  at: number;
  dur: number;
  /** How hard this spurt tears, 0 to 1. */
  amt: number;
}

/** The perforation snapping, then a crackling rip for each burst. */
export function playRip(bursts: RipBurst[]) {
  const r = ready();
  if (!r) return;
  const { c, buf } = r;
  const t0 = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.55;
  out.connect(c.destination);

  // Snap: a hard, bright click.
  const snapHp = c.createBiquadFilter();
  snapHp.type = "highpass";
  snapHp.frequency.value = 1800;
  const snap = c.createGain();
  snap.gain.setValueAtTime(0.9, t0);
  snap.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);
  source(c, buf, t0, 0.05).connect(snapHp).connect(snap).connect(out);

  for (const b of bursts) {
    const at = t0 + b.at;
    // The fibres: band-passed noise chopped into irregular grains, falling a little in pitch as the spurt slows.
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(2600 + Math.random() * 1400, at);
    band.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 500, at + b.dur);
    const grains = c.createGain();
    grains.gain.setValueAtTime(0, at);
    for (let t = 0; t < b.dur; t += 0.005 + Math.random() * 0.012) {
      const fade = 1 - (t / b.dur) * 0.6;
      grains.gain.setValueAtTime((0.25 + Math.random() * 0.75) * b.amt * fade, at + t);
      grains.gain.linearRampToValueAtTime(0.04 * b.amt, at + t + 0.004);
    }
    grains.gain.linearRampToValueAtTime(0, at + b.dur + 0.02);
    source(c, buf, at, b.dur).connect(band).connect(grains).connect(out);

    // The body of the sheet: a low, papery rasp under the crackle.
    const low = c.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 700;
    const body = c.createGain();
    body.gain.setValueAtTime(0, at);
    body.gain.linearRampToValueAtTime(0.35 * b.amt, at + 0.015);
    body.gain.linearRampToValueAtTime(0, at + b.dur);
    source(c, buf, at, b.dur).connect(low).connect(body).connect(out);
  }
}

/** Air rushing past the falling halves, with a paper flutter in it. */
export function playFall(delay = 0) {
  const r = ready();
  if (!r) return;
  const { c, buf } = r;
  const at = c.currentTime + 0.01 + delay;
  const dur = 1.3;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.1;
  band.frequency.setValueAtTime(260, at);
  band.frequency.exponentialRampToValueAtTime(1100, at + 0.55);
  band.frequency.exponentialRampToValueAtTime(380, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.32, at + 0.4);
  g.gain.linearRampToValueAtTime(0, at + dur);
  // Flutter: the level wobbles a dozen times a second, like a sheet catching the air.
  const flutter = c.createGain();
  flutter.gain.value = 0.7;
  const lfo = c.createOscillator();
  lfo.frequency.setValueAtTime(9, at);
  lfo.frequency.linearRampToValueAtTime(16, at + dur);
  const depth = c.createGain();
  depth.gain.value = 0.3;
  lfo.connect(depth).connect(flutter.gain);
  lfo.start(at);
  lfo.stop(at + dur + 0.05);
  source(c, buf, at, dur).connect(band).connect(g).connect(flutter).connect(c.destination);
}

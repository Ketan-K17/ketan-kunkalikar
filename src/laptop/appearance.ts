import { ACCENTS, prefs } from './prefs';

/**
 * Wallpaper, light/dark and accent colour. Built-in wallpapers are painted on a canvas (no image files needed);
 * the owner can add photos through assets.json. The accent colour and the menu-bar text colour are sampled from
 * whichever picture is on the desktop, so the whole UI tints itself to match.
 */

export const BUILTIN_WALLPAPERS: { id: string; name: string }[] = [
  { id: 'aurora', name: 'Aurora' },
  { id: 'aqua', name: 'Aqua Blue' },
  { id: 'meadow', name: 'Meadow' },
  { id: 'graphite', name: 'Graphite' },
];

export interface Look {
  dark: boolean;
  accent: string;
  /** Text colour for the transparent menu bar: dark text over bright wallpaper tops. */
  menubarDark: boolean;
  wallpaperUrl: string;
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** Calls `f` when the system switches light/dark (only matters while the scheme is "system"). */
export function onSystemScheme(f: () => void) {
  darkQuery.addEventListener?.('change', f);
}

export async function resolveLook(): Promise<Look> {
  const url = wallpaperUrl(prefs.wallpaper);
  const sample = await sampleImage(url).catch(() => null);
  const accent = prefs.accent === 'wallpaper' ? (sample?.accent ?? ACCENTS.blue) : (ACCENTS[prefs.accent] ?? ACCENTS.blue);
  const dark = prefs.scheme === 'dark' || (prefs.scheme === 'system' && darkQuery.matches);
  return { dark, accent, menubarDark: sample?.brightTop ?? false, wallpaperUrl: url };
}

export function wallpaperUrl(id: string): string {
  if (id.startsWith('builtin:')) return paint(id.slice(8));
  return import.meta.env.BASE_URL + 'laptop/' + id;
}

/** Small thumbnail data URL for the Desktop preferences pane. */
export function wallpaperThumb(id: string, thumb?: string): string {
  return id.startsWith('builtin:') ? paint(id.slice(8), 160, 100) : wallpaperUrl(thumb ?? id);
}

// ---------- Sampling ----------

async function sampleImage(url: string): Promise<{ accent: string; brightTop: boolean }> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const N = 24;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;

  let x = 0, y = 0, sw = 0, sv = 0, wsum = 0, topLum = 0;
  for (let i = 0; i < N * N; i++) {
    const r = d[i * 4] / 255, gg = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
    const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
    const s = max ? (max - min) / max : 0;
    if (i < N * 2) topLum += 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    if (max === min) continue;
    let h = max === r ? (gg - b) / (max - min) : max === gg ? 2 + (b - r) / (max - min) : 4 + (r - gg) / (max - min);
    h = (h * 60 + 360) % 360;
    // Vivid, bright pixels decide the accent; murky shadows barely count.
    const w = s * s * max;
    x += Math.cos((h * Math.PI) / 180) * w;
    y += Math.sin((h * Math.PI) / 180) * w;
    sw += s * w;
    sv += max * w;
    wsum += w;
  }
  const brightTop = topLum / (N * 2) > 0.62;
  if (wsum < 2) return { accent: ACCENTS.graphite, brightTop };
  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const sat = Math.min(0.72, Math.max(0.38, sw / wsum));
  const light = Math.min(0.56, Math.max(0.44, (sv / wsum) * 0.55));
  return { accent: `hsl(${hue.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(light * 100).toFixed(0)}%)`, brightTop };
}

// ---------- Painted wallpapers ----------

const painted = new Map<string, string>();

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Paints wallpaper `id` at W×H and returns a data URL. Soft shapes are drawn on a tiny canvas and scaled up,
 * which blurs them the same in every browser (canvas `filter` isn't everywhere).
 */
function paint(id: string, W = Math.min(1920, Math.round(screen.width * Math.min(2, devicePixelRatio))), H = Math.round((W * 10) / 16)): string {
  const key = `${id}@${W}`;
  const hit = painted.get(key);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const soft = document.createElement('canvas');
  soft.width = 96;
  soft.height = 60;
  const s = soft.getContext('2d')!;
  const sw = soft.width, sh = soft.height;
  const rand = rng(id.length * 977 + id.charCodeAt(0));
  const vgrad = (ctx: CanvasRenderingContext2D, h: number, stops: [number, string][]) => {
    const lg = ctx.createLinearGradient(0, 0, 0, h);
    for (const [o, col] of stops) lg.addColorStop(o, col);
    return lg;
  };
  const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  };
  const upscale = () => {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(soft, 0, 0, W, H);
  };

  if (id === 'aurora') {
    g.fillStyle = vgrad(g, H, [[0, '#04051a'], [0.5, '#130c33'], [1, '#2b0f3f']]);
    g.fillRect(0, 0, W, H);
    // Rays fanning up from below the horizon.
    s.globalCompositeOperation = 'lighter';
    const ox = sw * 0.5, oy = sh * 1.08;
    for (let i = 0; i < 90; i++) {
      const a = (-168 + rand() * 156) * (Math.PI / 180);
      const spread = (0.6 + rand() * 1.6) * (Math.PI / 180);
      const len = sh * (0.7 + rand() * 0.75);
      const hue = rand() < 0.55 ? 300 + rand() * 30 : 255 + rand() * 30;
      const lg = s.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      lg.addColorStop(0, `hsla(${hue},90%,78%,${0.18 + rand() * 0.2})`);
      lg.addColorStop(1, `hsla(${hue},90%,60%,0)`);
      s.fillStyle = lg;
      s.beginPath();
      s.moveTo(ox, oy);
      s.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
      s.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
      s.fill();
    }
    glow(s, sw * 0.5, sh * 0.92, sw * 0.32, sh * 0.2, 'rgba(255,225,250,0.55)');
    glow(s, sw * 0.22, sh * 0.6, sw * 0.35, sh * 0.16, 'rgba(230,90,200,0.35)');
    glow(s, sw * 0.8, sh * 0.62, sw * 0.35, sh * 0.16, 'rgba(140,90,255,0.32)');
    glow(s, sw * 0.5, sh * 1.0, sw * 0.6, sh * 0.25, 'rgba(120,60,180,0.4)');
    upscale();
    // Stars on top, crisp.
    for (let i = 0; i < (W * H) / 5000; i++) {
      const r = rand() ** 3 * 1.6 * (W / 1280) + 0.3;
      g.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.7})`;
      g.beginPath();
      g.arc(rand() * W, rand() * H * 0.95, r, 0, Math.PI * 2);
      g.fill();
    }
  } else if (id === 'aqua' || id === 'graphite') {
    const blue = id === 'aqua';
    g.fillStyle = vgrad(g, H, blue ? [[0, '#0a2f7a'], [0.55, '#1f6fd0'], [1, '#7dbcf0']] : [[0, '#1b1d22'], [0.55, '#4a4f58'], [1, '#9aa1ab']]);
    g.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'lighter';
    s.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      s.strokeStyle = `rgba(255,255,255,${0.05 + rand() * 0.12})`;
      s.lineWidth = 2 + rand() * 9;
      s.beginPath();
      const y0 = sh * (0.3 + rand() * 0.6);
      s.moveTo(-10, y0);
      s.bezierCurveTo(sw * 0.3, y0 - sh * (0.2 + rand() * 0.4), sw * 0.7, y0 + sh * (rand() * 0.5 - 0.1), sw + 10, y0 - sh * (0.2 + rand() * 0.3));
      s.stroke();
    }
    glow(s, sw * 0.7, sh * 0.25, sw * 0.4, sh * 0.25, blue ? 'rgba(160,220,255,0.35)' : 'rgba(220,225,235,0.25)');
    upscale();
  } else {
    // meadow: out-of-focus leaves and light.
    g.fillStyle = vgrad(g, H, [[0, '#14321a'], [0.5, '#2f6a33'], [1, '#76a24a']]);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const r = sw * (0.05 + rand() * 0.2);
      glow(s, rand() * sw, rand() * sh, r, r, `hsla(${80 + rand() * 50},${50 + rand() * 30}%,${40 + rand() * 30}%,${0.25 + rand() * 0.35})`);
    }
    glow(s, sw * 0.3, sh * 0.35, sw * 0.25, sh * 0.25, 'rgba(230,250,190,0.35)');
    upscale();
    for (let i = 0; i < 14; i++) {
      const r = (12 + rand() * 50) * (W / 1280);
      const x = rand() * W, y = rand() * H;
      const rg = g.createRadialGradient(x, y, r * 0.6, x, y, r);
      rg.addColorStop(0, `rgba(240,255,210,${0.04 + rand() * 0.08})`);
      rg.addColorStop(0.9, `rgba(240,255,210,${0.1 + rand() * 0.1})`);
      rg.addColorStop(1, 'rgba(240,255,210,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }

  const url = c.toDataURL('image/jpeg', 0.9);
  painted.set(key, url);
  return url;
}

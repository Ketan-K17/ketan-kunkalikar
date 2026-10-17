/** The laptop's System Preferences, kept in localStorage (per device; it's only looks and volume). */
export interface Prefs {
  scheme: 'system' | 'light' | 'dark';
  /** `wallpaper` samples a colour from the desktop picture; anything else is a key of ACCENTS. */
  accent: string;
  /** `builtin:<id>` for a painted wallpaper, otherwise a file path from assets.json. */
  wallpaper: string;
  volume: number;
  muted: boolean;
  uiSounds: boolean;
  /** `glass` is the see-through Leopard-ish finish; `aqua` is opaque pinstripes and brushed metal, like Jaguar/Tiger. */
  style: 'glass' | 'aqua';
  /** Minutes of no input before the Flurry screen saver starts; 0 = never. */
  saverAfter: number;
  /** Menu-bar clock as a little analog face instead of text. */
  analogClock: boolean;
  batteryPercent: boolean;
  dockMagnify: boolean;
}

export const ACCENTS: Record<string, string> = {
  blue: '#3b7fe0',
  graphite: '#7f8b99',
  purple: '#9a5bd1',
  pink: '#e0569f',
  red: '#df4a40',
  orange: '#ef8a26',
  yellow: '#e2b628',
  green: '#5aa83a',
  teal: '#2ea2a8',
};

const KEY = 'laptop-prefs';
const DEFAULTS: Prefs = { scheme: 'system', accent: 'wallpaper', wallpaper: 'wallpapers/green-hills.jpg', volume: 0.7, muted: false, uiSounds: true, style: 'glass', saverAfter: 5, analogClock: false, batteryPercent: true, dockMagnify: true };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const prefs: Prefs = load();
const listeners = new Set<() => void>();

export function setPrefs(p: Partial<Prefs>) {
  Object.assign(prefs, p);
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or storage blocked: the change still applies for this visit.
  }
  listeners.forEach((f) => f());
}

/** Calls `f` after every change. Returns the function that stops it. */
export function onPrefs(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

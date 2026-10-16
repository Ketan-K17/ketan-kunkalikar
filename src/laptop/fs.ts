import { DESKTOP, type DesktopApp, type DesktopFile, type DesktopFolder, type DesktopNode } from './desktop';

/**
 * The laptop's "file system": lookups over DESKTOP plus the little state that changes while you use it. Trash is
 * in memory (it survives Shut Down, not a page reload), so nothing the owner put
 * in `desktop.ts` can be lost for good. Edited documents, recent items and desktop icon spots are kept in
 * localStorage, because the point of saving a document is that it is still there tomorrow.
 */

/** Every node, depth first. */
export function allNodes(nodes: DesktopNode[] = DESKTOP, out: DesktopNode[] = []): DesktopNode[] {
  for (const n of nodes) {
    out.push(n);
    if (n.type === 'folder') allNodes(n.children, out);
  }
  return out;
}

/** The folders leading to `target` (not including it), or null when it isn't in DESKTOP. */
export function trailTo(target: DesktopNode, nodes: DesktopNode[] = DESKTOP, trail: DesktopFolder[] = []): DesktopFolder[] | null {
  for (const n of nodes) {
    if (n === target) return trail;
    if (n.type === 'folder') {
      const t = trailTo(target, n.children, [...trail, n]);
      if (t) return t;
    }
  }
  return null;
}

/** A stable key for a node: its ids from the top, `projects/ideas/macros`. */
export function pathOf(n: DesktopNode): string {
  return [...(trailTo(n) ?? []), n].map((x) => x.id).join('/');
}

export function nodeAt(path: string): DesktopNode | undefined {
  const sys = SYSTEM_APPS.find((a) => a.id === path);
  if (sys) return sys;
  let list = DESKTOP;
  let found: DesktopNode | undefined;
  for (const id of path.split('/')) {
    found = list.find((n) => n.id === id);
    if (!found) return undefined;
    list = found.type === 'folder' ? found.children : [];
  }
  return found;
}

/** "Macintosh HD ▸ Desktop ▸ Projects", the way Get Info shows where something is. */
export function whereOf(n: DesktopNode): string {
  if (n.type === 'app') return 'Macintosh HD/Applications';
  return ['Macintosh HD', 'Desktop', ...(trailTo(n) ?? []).map((f) => f.name)].join('/');
}

/**
 * The laptop's own apps. They live in Applications next to the owner's, and their `url` is `builtin:<id>`, which
 * MacScreen opens as a window instead of handing to the real computer.
 */
export const SYSTEM_APPS: DesktopApp[] = [
  { type: 'app', id: 'calculator', name: 'Calculator', url: 'builtin:calculator', color: 0x444444, glyph: '=' },
  { type: 'app', id: 'mail', name: 'Mail', url: 'builtin:mail', color: 0x2f74c8, glyph: '@' },
  { type: 'app', id: 'dashboard', name: 'Dashboard', url: 'builtin:dashboard', color: 0x222222, glyph: 'D' },
  { type: 'app', id: 'preview', name: 'Preview', url: 'builtin:preview', color: 0x3b7fe0, glyph: 'P' },
  { type: 'app', id: 'prefs', name: 'System Preferences', url: 'builtin:prefs', color: 0x888888, glyph: 'S' },
  { type: 'app', id: 'terminal', name: 'Terminal', url: 'builtin:terminal', color: 0x111111, glyph: '>' },
  { type: 'app', id: 'textedit', name: 'TextEdit', url: 'builtin:textedit', color: 0xffffff, glyph: 'T' },
];

/** Everything in /Applications, by name. */
export const allApps = () => [...DESKTOP.filter((n): n is DesktopApp => n.type === 'app'), ...SYSTEM_APPS].sort((a, b) => a.name.localeCompare(b.name));

// ---------- Trash (in memory) ----------

const trashed = new Set<DesktopNode>();
const emptied = new Set<DesktopNode>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());

export function onFsChange(f: () => void) {
  listeners.add(f);
}

/** False for anything in the Trash or emptied out of it, so listings skip it. */
export const isPresent = (n: DesktopNode) => !trashed.has(n) && !emptied.has(n);
export const trashItems = () => [...trashed];
export const canTrash = (n: DesktopNode) => n.type !== 'app' && isPresent(n);

export function moveToTrash(nodes: DesktopNode[]) {
  for (const n of nodes) if (canTrash(n)) trashed.add(n);
  changed();
}

export function putBack(nodes: DesktopNode[]) {
  for (const n of nodes) trashed.delete(n);
  changed();
}

export function emptyTrash() {
  for (const n of trashed) emptied.add(n);
  trashed.clear();
  changed();
}

// ---------- Saved things (localStorage) ----------

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Storage blocked: it still works for this visit.
  }
}

const DOCS_KEY = 'laptop-docs';
const docs = read<Record<string, string>>(DOCS_KEY, {});

/** The text of a document: what the owner last saved in TextEdit, or the pages from desktop.ts joined by blank lines. */
export function docText(f: DesktopFile): string {
  return docs[pathOf(f)] ?? f.text.join('\n\n');
}

export function saveDoc(f: DesktopFile, text: string) {
  docs[pathOf(f)] = text;
  write(DOCS_KEY, docs);
}

export const isEdited = (f: DesktopFile) => pathOf(f) in docs;

/** Apple menu > Recent Items: newest first. Apps and documents, like the real one. */
const RECENT_KEY = 'laptop-recent';
let recent = read<string[]>(RECENT_KEY, []);

export function noteRecent(n: DesktopNode) {
  if (n.type === 'folder') return;
  const p = pathOf(n);
  recent = [p, ...recent.filter((x) => x !== p)].slice(0, 10);
  write(RECENT_KEY, recent);
}

export function recentItems(): DesktopNode[] {
  return recent.map(nodeAt).filter((n): n is DesktopNode => !!n && isPresent(n));
}

export function clearRecent() {
  recent = [];
  write(RECENT_KEY, recent);
}

/** Where the owner dragged each desktop icon (px from the top right of the desktop), by item key. */
const SPOTS_KEY = 'laptop-icon-spots';
const spots = read<Record<string, { r: number; t: number }>>(SPOTS_KEY, {});

export const iconSpot = (key: string) => spots[key];

export function setIconSpot(key: string, spot: { r: number; t: number } | null) {
  if (spot) spots[key] = spot;
  else delete spots[key];
  write(SPOTS_KEY, spots);
}

export function clearIconSpots() {
  for (const k of Object.keys(spots)) delete spots[k];
  write(SPOTS_KEY, spots);
}

/** Pretend sizes and dates for Get Info and the list view, stable per item, so the Finder has something to sort by. */
export function sizeOf(n: DesktopNode): number {
  if (n.type === 'folder') return n.children.filter(isPresent).reduce((a, c) => a + sizeOf(c), 0);
  if (n.type === 'app') return 18_000_000 + (hash(n.id) % 60) * 1_000_000;
  if (n.icon === 'pdf') return 180_000 + (hash(n.id) % 200) * 1000;
  if (n.icon === 'link') return 4096;
  if (n.icon === 'image') return 1_200_000 + (hash(n.id) % 900) * 1000;
  return Math.max(4096, docText(n).length);
}

export function fmtSize(bytes: number): string {
  if (bytes === 0) return 'Zero KB';
  if (bytes < 1_000_000) return `${Math.max(4, Math.ceil(bytes / 4096) * 4)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** A date in 2007, Leopard's year. */
export function dateOf(n: DesktopNode): Date {
  const h = hash(pathOf(n));
  return new Date(2007, h % 12, 1 + (h % 27), 9 + (h % 11), h % 60);
}

export const fmtDate = (d: Date) =>
  `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

import type { DesktopApp, DesktopNode } from './desktop';

/**
 * Icons are inline SVG strings (no image files, per the repo rule), drawn in the glossy Aqua style of early-2000s
 * Mac OS X: gradients, a white gloss on top, soft edges. Stylised placeholders, not exact artwork. Gradients and
 * patterns are defined once in DEFS, which MacScreen puts in the DOM. The exceptions are the GitHub, LinkedIn and
 * Mail icons: those are the real logo files from public/laptop/logos, not drawings.
 */
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="mi-fback" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cbcf0"/><stop offset="1" stop-color="#3a7fcf"/></linearGradient>
  <linearGradient id="mi-ffront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4e5ff"/><stop offset=".5" stop-color="#8cc6f6"/><stop offset="1" stop-color="#5ea6ea"/></linearGradient>
  <pattern id="mi-stripe" width="4" height="2" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".18"/></pattern>
  <linearGradient id="mi-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
  <linearGradient id="mi-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset=".55" stop-color="#c9cdd3"/><stop offset="1" stop-color="#8f949c"/></linearGradient>
  <linearGradient id="mi-metal-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa0a8"/><stop offset=".3" stop-color="#eef0f2"/><stop offset=".7" stop-color="#c4c8ce"/><stop offset="1" stop-color="#8b9199"/></linearGradient>
  <pattern id="mi-mesh" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0L3 3M3 0L0 3" stroke="#5d636b" stroke-width=".5"/></pattern>
  <linearGradient id="mi-finl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f8ff"/><stop offset="1" stop-color="#a9cbf3"/></linearGradient>
  <linearGradient id="mi-finr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78b0f6"/><stop offset="1" stop-color="#1d55c4"/></linearGradient>
  <linearGradient id="mi-page" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e9ecf0"/></linearGradient>
  <radialGradient id="mi-globe" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9fd2ff"/><stop offset=".6" stop-color="#3b8fe6"/><stop offset="1" stop-color="#1d5cb0"/></radialGradient>
  <linearGradient id="mi-wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63e583"/><stop offset="1" stop-color="#1bb653"/></linearGradient>
  <linearGradient id="mi-notes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d8cf0"/><stop offset="1" stop-color="#0a56c2"/></linearGradient>
  <linearGradient id="mi-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d6be0"/><stop offset="1" stop-color="#9a5ad6"/></linearGradient>
  <linearGradient id="mi-calc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b6f76"/><stop offset="1" stop-color="#2c2f34"/></linearGradient>
  <linearGradient id="mi-lcd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f1d8"/><stop offset="1" stop-color="#b9c79e"/></linearGradient>
  <linearGradient id="mi-orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc067"/><stop offset="1" stop-color="#e8790f"/></linearGradient>
  <linearGradient id="mi-term" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d42"/><stop offset="1" stop-color="#0d0e10"/></linearGradient>
  <radialGradient id="mi-dash" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#0c0c10"/></radialGradient>
  <linearGradient id="mi-caution" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe46b"/><stop offset="1" stop-color="#f2b705"/></linearGradient>
  <linearGradient id="mi-pen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa0a8"/><stop offset=".5" stop-color="#f4f5f7"/><stop offset="1" stop-color="#8b9199"/></linearGradient>
  <radialGradient id="mi-user" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#2b6fd0"/></radialGradient>
</defs></svg>`;

const svg = (body: string, view = '0 0 64 64') => `<svg viewBox="${view}" xmlns="http://www.w3.org/2000/svg" draggable="false">${body}</svg>`;

/** White shine across the top of a rounded tile: the thing that makes it look like Aqua. */
const gloss = (x: number, y: number, w: number, h: number, r: number) => `<rect x="${x + 2}" y="${y + 1.5}" width="${w - 4}" height="${h * 0.48}" rx="${r - 1.5}" fill="url(#mi-gloss)" opacity=".7"/>`;

/** Emblems pressed into a folder front, in 64×64 coordinates around the folder's middle. */
const EMBLEM: Record<string, string> = {
  apps: `<path d="M32 30l-9 18h4l1.6-3.6h6.8L37 48h4zm-2.3 11L32 35.6 34.3 41z"/><rect x="22" y="44" width="20" height="2.4" rx="1"/>`,
  music: `<path d="M36 30v13.3a4 4 0 1 1-2.4-3.7V33l-7 1.6v10.7a4 4 0 1 1-2.4-3.7V32z"/>`,
  photos: `<rect x="23" y="32" width="18" height="14" rx="1.5" fill="none" stroke-width="2.2"/><path d="M25 44l5-5 3 3 3-4 4 6z"/>`,
  journal: `<path d="M24 46l2-6 12-12 4 4-12 12zm3.5-4.5l1.5 1.5"/>`,
  desktop: `<rect x="22" y="31" width="20" height="13" rx="1.5" fill="none" stroke-width="2.2"/><rect x="28" y="45" width="8" height="2" rx="1"/>`,
};
EMBLEM.locked = `<rect x="26" y="37" width="12" height="9" rx="1.5"/><path d="M28.5 37v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke-width="2"/>`;
const emblemFor = (name: string) => EMBLEM[name.toLowerCase()] ?? '';

export function folderIcon(emblem = '') {
  return svg(
    `<path d="M5 15a3 3 0 0 1 3-3h15l4 4.5h29a3 3 0 0 1 3 3V50H5z" fill="url(#mi-fback)"/>` +
      `<rect x="8" y="19" width="48" height="10" rx="1" fill="#fff" opacity=".92"/>` +
      `<path d="M3.5 25h57l-2.6 29.4a3 3 0 0 1-3 2.6H9.1a3 3 0 0 1-3-2.6z" fill="url(#mi-ffront)" stroke="#3a78c2" stroke-width=".8"/>` +
      `<path d="M3.5 25h57l-2.6 29.4a3 3 0 0 1-3 2.6H9.1a3 3 0 0 1-3-2.6z" fill="url(#mi-stripe)"/>` +
      `<path d="M4.4 26h55.2l-.7 8H5.1z" fill="#fff" opacity=".35"/>` +
      (emblem ? `<g fill="#3d78bd" stroke="#3d78bd" opacity=".75">${emblem}</g>` : ''),
  );
}

const page = (inner: string) =>
  svg(
    `<path d="M14 5h25l13 13v39a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="url(#mi-page)" stroke="#9aa1ab" stroke-width=".8"/>` +
      `<path d="M39 5v11a2 2 0 0 0 2 2h11z" fill="#d9dde3" stroke="#9aa1ab" stroke-width=".8"/>${inner}`,
  );

/** A gear for System Preferences, generated so the teeth are even. */
function gear(cx: number, cy: number, r: number, teeth: number) {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r * 0.8;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}

/** An official logo file from public/laptop/logos, placed in the 64×64 icon box. */
const logo = (file: string, x: number, y: number, w: number, h: number) =>
  `<image href="${import.meta.env.BASE_URL}laptop/logos/${file}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;

export const ICON = {
  folder: folderIcon(),
  appsFolder: folderIcon(EMBLEM.apps),
  desktopFolder: folderIcon(EMBLEM.desktop),
  doc: page(`<path d="M19 27h26M19 33h26M19 39h26M19 45h17" stroke="#a5acb6" stroke-width="2.4" stroke-linecap="round"/>`),
  image: page(
    `<rect x="17" y="25" width="30" height="26" rx="1.5" fill="#fff" stroke="#8d949e" stroke-width=".8"/><rect x="19" y="27" width="26" height="22" fill="#7cc3f5"/><path d="M19 49v-8l8-6 7 5 11-8v17z" fill="#4c9f50"/><circle cx="38" cy="32" r="2.6" fill="#ffd54a"/>`,
  ),
  webloc: page(
    `<circle cx="32" cy="38" r="12" fill="url(#mi-globe)" stroke="#1f5fae" stroke-width=".8"/><path d="M20 38h24M32 26c-4.5 3.5-4.5 20.5 0 24M32 26c4.5 3.5 4.5 20.5 0 24M22.5 31.5h19M22.5 44.5h19" fill="none" stroke="#e8f3ff" stroke-width="1" opacity=".85"/>`,
  ),
  // Apple's own Mail stamp from Leopard / Snow Leopard, not a drawing.
  mail: svg(logo('mail-stamp.png', 0, 0, 64, 64)),
  finder: svg(
    `<rect x="5" y="5" width="54" height="54" rx="9" fill="url(#mi-finr)"/>` +
      `<path d="M14 5h20c-3 9-7 17-5 27h5c-2 8-1 18 3 27H14a9 9 0 0 1-9-9V14a9 9 0 0 1 9-9z" fill="url(#mi-finl)"/>` +
      `<path d="M34 5c-3 9-7 17-5 27h5c-2 8-1 18 3 27" fill="none" stroke="#0e2a5c" stroke-width="2"/>` +
      `<rect x="18" y="18" width="4" height="10" rx="1.6" fill="#0e2a5c"/><rect x="42" y="18" width="4" height="10" rx="1.6" fill="#0e2a5c"/>` +
      `<path d="M15 40q17 12 34 0" fill="none" stroke="#0e2a5c" stroke-width="2.6" stroke-linecap="round"/>` +
      gloss(5, 5, 54, 54, 9) +
      `<rect x="5" y="5" width="54" height="54" rx="9" fill="none" stroke="#1a3f86" stroke-width=".8"/>`,
  ),
  trash: svg(
    `<ellipse cx="32" cy="56" rx="16" ry="3.5" fill="#000" opacity=".18"/>` +
      `<path d="M14 15h36l-3.5 39a3 3 0 0 1-3 2.7H20.5a3 3 0 0 1-3-2.7z" fill="url(#mi-metal-h)"/>` +
      `<path d="M15.5 18h33l-3.2 35.4a2 2 0 0 1-2 1.8H20.7a2 2 0 0 1-2-1.8z" fill="url(#mi-mesh)" opacity=".75"/>` +
      `<path d="M17.5 30h29M18.5 42h27" stroke="#80868f" stroke-width="1.4" opacity=".7"/>` +
      `<ellipse cx="32" cy="15" rx="18.5" ry="4.5" fill="url(#mi-metal)" stroke="#7b8189" stroke-width=".8"/>` +
      `<ellipse cx="32" cy="15" rx="15.5" ry="3" fill="#4a4f56" opacity=".55"/>`,
  ),
  hd: svg(
    `<path d="M8 22l6-10h36l6 10z" fill="#d8dbe0" stroke="#7d838b" stroke-width=".8"/>` +
      `<rect x="7" y="22" width="50" height="26" rx="3" fill="url(#mi-metal)" stroke="#6f757d" stroke-width=".8"/>` +
      `<rect x="12" y="37" width="40" height="3.2" rx="1.6" fill="#5a6068" opacity=".75"/>` +
      `<circle cx="49" cy="29" r="1.6" fill="#7bd36b"/>` +
      `<rect x="9" y="23.5" width="46" height="8" rx="2" fill="#fff" opacity=".45"/>`,
  ),
  prefs: svg(
    `<rect x="6" y="6" width="52" height="52" rx="8" fill="url(#mi-metal)" stroke="#7b8189" stroke-width=".8"/>` +
      `<g fill="#5b6169">${gear(32, 32, 17, 12)}</g><circle cx="32" cy="32" r="8.5" fill="#d7dade"/><circle cx="32" cy="32" r="4" fill="#5b6169"/>` +
      gloss(6, 6, 52, 52, 8),
  ),
  trashFull: svg(
    `<ellipse cx="32" cy="56" rx="16" ry="3.5" fill="#000" opacity=".18"/>` +
      `<path d="M14 15h36l-3.5 39a3 3 0 0 1-3 2.7H20.5a3 3 0 0 1-3-2.7z" fill="url(#mi-metal-h)"/>` +
      `<path d="M15.5 18h33l-3.2 35.4a2 2 0 0 1-2 1.8H20.7a2 2 0 0 1-2-1.8z" fill="url(#mi-mesh)" opacity=".75"/>` +
      `<path d="M17 14l6-7 5 6 6-8 4 7 8-3-2 9z" fill="#f4f1e8" stroke="#a9a59a" stroke-width=".8"/><path d="M22 14l14-6 9 6" fill="#dfe8f4" stroke="#9aa5b4" stroke-width=".8"/>` +
      `<ellipse cx="32" cy="15" rx="18.5" ry="4.5" fill="none" stroke="#7b8189" stroke-width="1.6"/>`,
  ),
  calculator: svg(
    `<rect x="12" y="5" width="40" height="54" rx="5" fill="url(#mi-calc)" stroke="#1c1e22" stroke-width=".8"/><rect x="16" y="9" width="32" height="11" rx="1.5" fill="url(#mi-lcd)"/><text x="45" y="18" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="9" fill="#2b3320">42</text>` +
      [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${16 + c * 8.3}" y="${24 + r * 8.5}" width="6.6" height="6.4" rx="1.6" fill="${c === 3 ? 'url(#mi-orange)' : '#c9ccd2'}"/>`).join('')).join('') +
      gloss(12, 5, 40, 54, 5),
  ),
  terminal: svg(
    `<rect x="6" y="8" width="52" height="46" rx="5" fill="url(#mi-metal)" stroke="#6f757d" stroke-width=".8"/><rect x="10" y="12" width="44" height="34" rx="2" fill="url(#mi-term)"/>` +
      `<path d="M15 20l6 4-6 4" fill="none" stroke="#e8e8e8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="24" y="27" width="9" height="2.4" fill="#e8e8e8"/>` +
      `<rect x="10" y="12" width="44" height="14" rx="2" fill="#fff" opacity=".08"/>`,
  ),
  textedit: svg(
    `<path d="M12 6h30l10 10v40a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="url(#mi-page)" stroke="#9aa1ab" stroke-width=".8"/>` +
      `<path d="M16 20h26M16 26h28M16 32h22M16 38h26M16 44h14" stroke="#9aa1ab" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M50 14l6 6-24 26-9 3 3-9z" fill="url(#mi-pen)" stroke="#5e646c" stroke-width=".8"/><path d="M26 40l-3 9 9-3z" fill="#2a2d33"/>`,
  ),
  dashboard: svg(
    `<circle cx="32" cy="32" r="26" fill="url(#mi-dash)" stroke="#000" stroke-width=".8"/>` +
      `<path d="M14 40a19 19 0 0 1 36 0" fill="none" stroke="#fff" stroke-width="2.2" opacity=".85"/>` +
      Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (1.12 + (i / 6) * 0.76);
        return `<line x1="${32 + Math.cos(a) * 15}" y1="${40 + Math.sin(a) * 15}" x2="${32 + Math.cos(a) * 19}" y2="${40 + Math.sin(a) * 19}" stroke="#fff" stroke-width="1.6"/>`;
      }).join('') +
      `<path d="M32 40l12-12" stroke="#ff5a3c" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="40" r="3" fill="#ddd"/>` +
      `<ellipse cx="32" cy="18" rx="18" ry="10" fill="url(#mi-gloss)" opacity=".45"/>`,
  ),
  preview: svg(
    `<rect x="8" y="10" width="44" height="40" rx="2" fill="#fff" stroke="#8d949e" stroke-width=".8" transform="rotate(-6 30 30)"/><rect x="12" y="14" width="40" height="32" fill="#7cc3f5" transform="rotate(-6 30 30)"/>` +
      `<path d="M12 46v-10l10-8 8 6 12-9 10 7v14z" fill="#4c9f50" transform="rotate(-6 30 30)"/>` +
      `<circle cx="46" cy="44" r="10" fill="#fff" fill-opacity=".35" stroke="#5e646c" stroke-width="3"/><path d="M53 51l6 6" stroke="#3d4248" stroke-width="5" stroke-linecap="round"/>`,
  ),
  profiler: svg(
    `<rect x="8" y="8" width="48" height="48" rx="6" fill="url(#mi-metal)" stroke="#7b8189" stroke-width=".8"/><rect x="14" y="14" width="36" height="24" rx="2" fill="#183058"/>` +
      `<path d="M16 32l6-8 5 5 6-10 5 7 4-3 6 9" fill="none" stroke="#7bd36b" stroke-width="1.8"/><rect x="14" y="42" width="36" height="3" rx="1.5" fill="#5b6169"/><rect x="14" y="48" width="22" height="3" rx="1.5" fill="#5b6169"/>` +
      gloss(8, 8, 48, 48, 6),
  ),
  caution: svg(
    `<path d="M32 6L60 56H4z" fill="url(#mi-caution)" stroke="#a07800" stroke-width="1.4" stroke-linejoin="round"/><rect x="29" y="22" width="6" height="20" rx="3" fill="#222"/><circle cx="32" cy="48" r="3.4" fill="#222"/>` +
      `<path d="M32 10L54 50H10z" fill="url(#mi-gloss)" opacity=".35"/>`,
  ),
  user: svg(
    `<rect x="4" y="4" width="56" height="56" rx="6" fill="url(#mi-user)"/><circle cx="32" cy="26" r="11" fill="#fbe0c4"/><path d="M21 22c1-9 21-10 22 0-4-3-17-4-22 0z" fill="#3a2a1c"/>` +
      `<path d="M12 60c2-13 10-19 20-19s18 6 20 19z" fill="#c0504d"/>` +
      gloss(4, 4, 56, 56, 6),
  ),
  laptop: svg(
    `<rect x="10" y="10" width="44" height="30" rx="3" fill="#1b1b1f"/><rect x="13" y="13" width="38" height="24" rx="1" fill="url(#mi-screen)"/><path d="M4 44h56l-4 8H8z" fill="#d6d9de"/><rect x="26" y="44" width="12" height="2" rx="1" fill="#aeb2ba"/>`,
  ),
} as const;

/** Brand-ish tiles for the apps we know. Anything else falls back to its `color` + `glyph`. */
const APP_ART: Record<string, string> = {
  whatsapp: svg(
    `<rect x="5" y="5" width="54" height="54" rx="12" fill="url(#mi-wa)"/><circle cx="32" cy="30" r="15" fill="none" stroke="#fff" stroke-width="4"/><path d="M16 49l4-11 8 7z" fill="#fff"/><path d="M26 23c0 8 7 15 15 15l3-4-5-3-3 2c-3-1-6-4-7-7l2-3-3-5z" fill="#fff"/>` +
      gloss(5, 5, 54, 54, 12),
  ),
  slack: svg(
    `<rect x="5" y="5" width="54" height="54" rx="12" fill="#fff" stroke="#d6d9de"/><g stroke-linecap="round" stroke-width="7"><path d="M24 14v13" stroke="#36c5f0"/><path d="M40 37v13" stroke="#2eb67d"/><path d="M14 40h13" stroke="#e01e5a"/><path d="M37 24h13" stroke="#ecb22e"/><path d="M40 14v6" stroke="#2eb67d"/><path d="M24 44v6" stroke="#ecb22e"/><path d="M14 24h6" stroke="#36c5f0"/><path d="M44 40h6" stroke="#e01e5a"/></g>` +
      gloss(5, 5, 54, 54, 12),
  ),
  // The mark's cat is cut out of the circle, so a white disc behind it keeps it readable on a dark Dock.
  github: svg(`<circle cx="32" cy="32.2" r="27" fill="#fff"/>` + logo('github-mark.svg', 3, 3, 58, 58)),
  youtube: svg(
    `<rect x="5" y="15" width="54" height="34" rx="11" fill="#f00"/><path d="M26 23l16 9-16 9z" fill="#fff"/>` + gloss(5, 15, 54, 34, 11),
  ),
  linkedin: svg(logo('linkedin-in-bug.png', 4, 4, 56, 56)),
  notes: svg(
    `<rect x="5" y="5" width="54" height="54" rx="12" fill="url(#mi-notes)"/><circle cx="32" cy="32" r="16" fill="#fff"/><path d="M24 27h16M24 33h16M24 39h9" stroke="#0a56c2" stroke-width="3" stroke-linecap="round"/>` +
      gloss(5, 5, 54, 54, 12),
  ),
};

// The laptop's own apps (fs.ts SYSTEM_APPS) wear their real icons wherever an app icon is drawn.
Object.assign(APP_ART, { 'dotfiles-repo': APP_ART.github, streams: APP_ART.youtube, mail: ICON.mail, calculator: ICON.calculator, terminal: ICON.terminal, textedit: ICON.textedit, preview: ICON.preview, prefs: ICON.prefs, dashboard: ICON.dashboard, profiler: ICON.profiler });

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function appIcon(app: DesktopApp): string {
  return (
    APP_ART[app.id] ??
    svg(
      `<rect x="5" y="5" width="54" height="54" rx="12" fill="${hex(app.color)}"/><text x="32" y="42" text-anchor="middle" font-family="Lucida Grande,-apple-system,Helvetica,Arial,sans-serif" font-size="28" font-weight="700" fill="#fff">${app.glyph.replace(/[<&]/g, '')}</text>` +
        gloss(5, 5, 54, 54, 12),
    )
  );
}

export function nodeIcon(node: DesktopNode): string {
  if (node.type === 'app') return appIcon(node);
  if (node.type === 'folder' && node.id.startsWith('__locked')) return folderIcon(EMBLEM.locked);
  if (node.type === 'folder') return node.id === '__apps' ? ICON.appsFolder : node.id === '__desktop' ? ICON.desktopFolder : folderIcon(emblemFor(node.name));
  return node.icon === 'image' ? ICON.image : node.icon === 'link' ? ICON.webloc : ICON.doc;
}

/** Small monochrome glyphs for the menu bar and toolbars. They use currentColor. */
const glyph = (body: string, view = '0 0 16 16') => svg(body, view);
export const GLYPH = {
  apple: glyph(
    `<path fill="currentColor" d="M8 4.7c-.8-.7-1.7-.9-2.6-.6C3.9 4.6 3 6.2 3.3 8.2c.3 2.1 1.5 4.1 2.8 4.1.6 0 1-.4 2-.4s1.3.4 2 .4c1.2 0 2.5-2 2.8-4.1.3-2-.6-3.6-2.1-4.1-.9-.3-1.8-.1-2.8.6z"/><path fill="currentColor" d="M8.4 3.4c0-1.2.7-2.1 1.8-2.4.1 1.2-.6 2.2-1.8 2.4z"/>`,
  ),
  speaker: glyph(`<path fill="currentColor" d="M2 6h2.5L8 3v10L4.5 10H2z"/><path d="M10.2 5.6a3.4 3.4 0 0 1 0 4.8M12 4a5.6 5.6 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`),
  speakerOff: glyph(`<path fill="currentColor" d="M2 6h2.5L8 3v10L4.5 10H2z"/><path d="M10.5 6l3.5 4M14 6l-3.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`),
  search: glyph(`<circle cx="6.8" cy="6.8" r="4.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`),
  back: glyph(`<path d="M10.5 3.5L5 8l5.5 4.5z" fill="currentColor"/>`),
  forward: glyph(`<path d="M5.5 3.5L11 8l-5.5 4.5z" fill="currentColor"/>`),
  grid: glyph(`<rect x="2.5" y="2.5" width="4.5" height="4.5" rx=".8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2.5" width="4.5" height="4.5" rx=".8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="2.5" y="9" width="4.5" height="4.5" rx=".8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="4.5" height="4.5" rx=".8" fill="none" stroke="currentColor" stroke-width="1.2"/>`),
  list: glyph(`<path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`),
  chevron: glyph(`<path d="M5.5 3l5 5-5 5z" fill="currentColor"/>`),
  columns: glyph(`<rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 3v10M10 3v10" stroke="currentColor" stroke-width="1.2"/>`),
};

/**
 * Aqua mouse pointers as CSS `cursor` values: the black arrow with a white edge, and the spinning wait cursor
 * ("beach ball") in four frames that MacScreen cycles while something is busy.
 */
const cursor = (body: string, x: number, y: number, fallback: string, w = 20, h = 24) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}") ${x} ${y}, ${fallback}`;

export const CURSOR = {
  arrow: cursor(`<path d='M1.5 1.5v17l4.2-4 2.9 6.6 2.8-1.2-2.8-6.4h5.9z' fill='#000' stroke='#fff' stroke-width='1.2' stroke-linejoin='round'/>`, 1, 1, 'default'),
  beachball: [0, 15, 30, 45].map((r) =>
    cursor(
      `<g transform='rotate(${r} 10 10)'><circle cx='10' cy='10' r='9' fill='#fff'/>` +
        ['#ff3b30', '#ff9500', '#ffcc00', '#4cd964', '#34aadc', '#5856d6'].map((c, i) => `<path d='M10 10L${10 + 8.4 * Math.cos((i * Math.PI) / 3)} ${10 + 8.4 * Math.sin((i * Math.PI) / 3)}A8.4 8.4 0 0 1 ${10 + 8.4 * Math.cos(((i + 1) * Math.PI) / 3)} ${10 + 8.4 * Math.sin(((i + 1) * Math.PI) / 3)}z' fill='${c}'/>`).join('') +
        `</g><ellipse cx='8' cy='6' rx='5' ry='3' fill='#fff' opacity='.55'/>`,
      10,
      10,
      'wait',
      20,
      20,
    ),
  ),
};

import { USER } from './desktop';
import type { Menu } from './MenuBar';
import { prefs, setPrefs } from './prefs';

/**
 * The status menus on the right of the menu bar, Tiger style: fast user switching (the owner's name), AirPort
 * and the battery. The battery and the network state are the real ones of the visitor's computer, when
 * the browser tells us (Chrome does; Safari and Firefox don't have the Battery API, so it shows a full charge).
 */
interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

let battery: BatteryLike | null = null;
let changed: () => void = () => {};

/** Starts listening to the battery and the network. `onChange` re-renders the menu bar. */
export function watchExtras(onChange: () => void) {
  changed = onChange;
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
  nav
    .getBattery?.()
    .then((b) => {
      battery = b;
      for (const ev of ['levelchange', 'chargingchange']) b.addEventListener(ev, () => changed());
      changed();
    })
    .catch(() => {});
  window.addEventListener('online', () => changed());
  window.addEventListener('offline', () => changed());
}

function batteryGlyph(level: number, charging: boolean) {
  const w = Math.max(1, Math.round(level * 15));
  const low = level < 0.15 && !charging;
  return (
    `<svg viewBox="0 0 24 12" class="mac-batt"><rect x=".75" y="1.75" width="19.5" height="8.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.2"/>` +
    `<rect x="21" y="4.2" width="1.8" height="3.6" rx=".6" fill="currentColor"/>` +
    `<rect x="2.75" y="3.75" width="${w}" height="4.5" rx=".5" fill="${low ? '#e2463c' : 'currentColor'}"/>` +
    (charging ? `<path d="M11.6 2.2L7.6 6.6h3l-1 3.4 4.2-4.6h-3z" fill="currentColor" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>` : '') +
    `</svg>`
  );
}

/** The AirPort fan: four bars of signal, hollow when offline. */
function airportGlyph(on: boolean) {
  const arc = (r: number, o: number) => `<path d="M${9 - r * 0.9} ${12 - r * 0.62}A${r} ${r} 0 0 1 ${9 + r * 0.9} ${12 - r * 0.62}L9 12z" fill="currentColor" opacity="${on ? o : 0.25}"/>`;
  return `<svg viewBox="0 0 18 14" class="mac-airport">${arc(10, 0.35)}${arc(7.4, 0.55)}${arc(4.8, 0.8)}${arc(2.4, 1)}</svg>`;
}

export function extraMenus(): Menu[] {
  const online = navigator.onLine;
  const level = battery?.level ?? 1;
  const charging = battery?.charging ?? true;
  const pct = `${Math.round(level * 100)}%`;
  return [
    {
      title: USER.name,
      html: `<span class="mac-user">${USER.name.replace(/[<&]/g, '')}</span>`,
      optional: true,
      items: [{ label: USER.name, checked: true }, 'sep', { label: 'Login Window…', disabled: true }],
    },
    {
      title: 'AirPort',
      html: airportGlyph(online),
      optional: true,
      items: [
        { label: online ? 'AirPort: On' : 'AirPort: No network', disabled: true },
        { label: 'Turn AirPort Off', disabled: true },
        'sep',
        { label: online ? 'Home' : 'No networks found', checked: online, disabled: !online },
        { label: 'Determination-5G', disabled: true },
        { label: 'Linksys (Neighbour)', disabled: true },
        'sep',
        { label: 'Join Other Network…', disabled: true },
      ],
    },
    {
      title: 'Battery',
      html: `${batteryGlyph(level, charging)}${prefs.batteryPercent ? `<span class="mac-batt-pct">${pct}</span>` : ''}`,
      items: [
        { label: charging ? (level >= 1 ? 'Battery Is Charged' : `${pct} — Charging`) : `${pct} Remaining`, disabled: true },
        { label: `Power Source: ${charging ? 'Power Adapter' : 'Battery'}`, disabled: true },
        'sep',
        {
          label: 'Show',
          submenu: [
            { label: 'Icon', checked: !prefs.batteryPercent, run: () => setPrefs({ batteryPercent: false }) },
            { label: 'Percentage', checked: prefs.batteryPercent, run: () => setPrefs({ batteryPercent: true }) },
          ],
        },
      ],
    },
  ];
}

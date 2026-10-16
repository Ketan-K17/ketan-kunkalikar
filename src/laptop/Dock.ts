import { el } from './dom';
import { play } from './sound';

export interface DockEntry {
  id: string;
  label: string;
  /** SVG string. */
  icon: string;
  /** Drawn instead of `icon`: a minimised window's live thumbnail. */
  node?: HTMLElement;
  /** Shows the little dot under the icon. */
  running?: boolean;
  onClick: () => void;
  /** Right-click, Control-click or a long press: the Dock menu for this tile, at a point on screen. */
  onMenu?: (x: number, y: number) => void;
}

/** How long a press must last to open a Dock menu on a touch screen (and on a mouse, like the real Dock). */
const HOLD_MS = 550;

const BASE = 48;
const BASE_NARROW = 40;
/** How much the icon under the pointer grows, and how quickly that falls off with distance (px). */
const MAX_BOOST = 0.9;
const SIGMA = 58;

/** Icon size for a Dock of `count` tiles: smaller on a phone, and shrunk until every tile fits across the screen. */
export function dockIconSize(count: number) {
  const fit = Math.floor((window.innerWidth - 40 - count * 6) / Math.max(1, count));
  return Math.max(26, Math.min(window.innerWidth < 600 ? BASE_NARROW : BASE, fit));
}

/**
 * The dock. Magnification uses transforms only: the layout never changes, so there is no feedback between where
 * the pointer is and where the icons are. Each icon is shifted so neighbours make room for the grown ones.
 */
export class Dock {
  readonly el: HTMLElement;
  private bg: HTMLElement;
  private row: HTMLElement;
  private items = new Map<string, HTMLElement>();
  private order: string[] = [];
  private size = BASE;
  private magnify = true;
  /** Turned off from the Apple menu's Dock submenu. */
  allowMagnify = true;

  constructor() {
    this.bg = el('div', { class: 'mac-dock-bg' });
    this.row = el('div', { class: 'mac-dock-row' });
    this.el = el('div', { class: 'mac-dock' }, this.bg, this.row);

    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && this.magnify) this.layout(e.clientX);
    });
    this.el.addEventListener('pointerleave', () => this.layout(null));
  }

  /** `left` are the apps, `right` come after the divider (minimised windows, trash). */
  setEntries(left: DockEntry[], right: DockEntry[]) {
    const narrow = window.innerWidth < 600;
    this.size = dockIconSize(left.length + right.length);
    this.magnify = this.allowMagnify && !narrow && window.matchMedia('(hover: hover)').matches;
    this.el.style.setProperty('--dock-icon', `${this.size}px`);

    this.items.clear();
    this.order = [];
    const make = (d: DockEntry) => {
      const art = d.node ? el('div', { class: 'mac-dock-art' }, d.node) : el('div', { class: 'mac-dock-art', html: d.icon });
      const icon = el('div', { class: 'mac-dock-icon' }, art);
      const item = el('button', { class: 'mac-dock-item', type: 'button', 'aria-label': d.label }, icon, el('div', { class: 'mac-dock-tip', text: d.label }), el('div', { class: `mac-dock-dot${d.running ? ' on' : ''}` }));
      let hold = 0;
      let held = false;
      const menu = (x: number, y: number) => {
        held = true;
        item.classList.remove('pressed');
        d.onMenu?.(x, y);
      };
      item.addEventListener('pointerdown', (e) => {
        play('button-down', 0.5);
        held = false;
        if (!d.onMenu || (e.pointerType === 'mouse' && e.button !== 0)) return;
        if (e.pointerType === 'mouse' && e.ctrlKey) return;
        item.classList.add('pressed');
        const r = item.getBoundingClientRect();
        hold = window.setTimeout(() => menu(r.left + r.width / 2, r.top - 8), HOLD_MS);
      });
      const cancel = () => {
        clearTimeout(hold);
        item.classList.remove('pressed');
      };
      item.addEventListener('pointerup', cancel);
      item.addEventListener('pointerleave', cancel);
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        cancel();
        if (!d.onMenu) return;
        const r = item.getBoundingClientRect();
        menu(r.left + r.width / 2, r.top - 8);
      });
      item.addEventListener('click', (e) => {
        if (held) return void (held = false);
        if (e.ctrlKey && d.onMenu) return;
        d.onClick();
      });
      this.items.set(d.id, item);
      this.order.push(d.id);
      return item;
    };
    this.row.replaceChildren(...left.map(make), el('div', { class: 'mac-dock-sep' }), ...right.map(make));
    this.layout(null);
  }

  bounce(id: string) {
    const art = this.items.get(id)?.querySelector('.mac-dock-art');
    if (!art) return;
    art.classList.remove('bounce');
    void (art as HTMLElement).offsetWidth;
    art.classList.add('bounce');
  }

  /** Screen rectangle of an item, or of the dock itself. */
  rectOf(id?: string): DOMRect {
    return (id && this.items.get(id)?.getBoundingClientRect()) || this.el.getBoundingClientRect();
  }

  private layout(pointerX: number | null) {
    const box = this.row.getBoundingClientRect();
    const els = this.order.map((id) => this.items.get(id)!);
    const grow = els.map((item) => {
      if (pointerX === null) return 0;
      // offsetLeft ignores transforms, so these are the resting centres.
      const centre = box.left + item.offsetLeft + item.offsetWidth / 2;
      const d = pointerX - centre;
      return MAX_BOOST * Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
    });
    const extra = grow.map((g) => g * this.size);
    const total = extra.reduce((a, b) => a + b, 0);

    let before = 0;
    els.forEach((item, i) => {
      const shift = -total / 2 + before + extra[i] / 2;
      before += extra[i];
      const icon = item.firstElementChild as HTMLElement;
      icon.style.transform = `translateX(${shift.toFixed(1)}px) scale(${(1 + grow[i]).toFixed(3)})`;
      item.style.setProperty('--lift', `${extra[i].toFixed(1)}px`);
      item.classList.toggle('hot', grow[i] > 0.4);
    });
    this.bg.style.transform = `scaleX(${(1 + total / Math.max(1, box.width)).toFixed(3)})`;
  }
}

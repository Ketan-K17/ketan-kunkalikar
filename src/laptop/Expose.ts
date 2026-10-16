import { el } from './dom';
import { play } from './sound';
import { MENU_H, type MacWindow, type WindowManager } from './Windows';

export type ExposeMode = 'all' | 'app' | 'desktop';

const MS = 340;

/**
 * Exposé, from Panther: F9 shrinks every window so they all fit side by side, F10 does that for the front app's
 * windows only, F11 pushes them all off the edges to show the desktop. Click a window to bring it forward; press
 * the key again or Esc to put everything back. Windows only get a transform, so their real positions never change.
 */
export class Expose {
  mode: ExposeMode | null = null;
  private catcher: HTMLElement;
  private label: HTMLElement;
  private hot: MacWindow | null = null;
  private shown: MacWindow[] = [];
  private timer = 0;

  constructor(private wm: WindowManager, private layer: HTMLElement) {
    this.label = el('div', { class: 'expose-label' });
    this.catcher = el('div', { class: 'expose-catch' }, this.label);
    this.catcher.addEventListener('pointermove', (e) => this.hover(this.under(e.clientX, e.clientY)));
    this.catcher.addEventListener('click', (e) => {
      const w = this.under(e.clientX, e.clientY);
      this.exit(w ?? undefined);
    });
    // Show Desktop: touching any window brings them all back.
    layer.addEventListener(
      'pointerdown',
      (e) => {
        if (this.mode === 'desktop' && (e.target as Element).closest('.mac-win')) this.exit();
      },
      true,
    );
  }

  toggle(mode: ExposeMode) {
    if (this.mode === mode) return this.exit();
    this.enter(mode);
  }

  enter(mode: ExposeMode) {
    const wins = this.wm.windows.filter((w) => this.wm.onScreen(w));
    if (!wins.length) return;
    clearTimeout(this.timer);
    this.mode = mode;
    play('expose');
    this.layer.classList.add('expose', `expose-${mode}`);
    this.layer.classList.remove(...['all', 'app', 'desktop'].filter((m) => m !== mode).map((m) => `expose-${m}`));
    const app = this.wm.active?.app;
    this.shown = mode === 'app' ? wins.filter((w) => w.app === app) : wins;
    for (const w of wins) w.el.classList.toggle('expose-dim', !this.shown.includes(w));
    if (mode === 'desktop') this.pushAway(wins);
    else this.tile(this.shown);
    if (mode !== 'desktop') this.layer.append(this.catcher);
  }

  /** Puts every window back. With `pick`, that window comes to the front once it has landed. */
  exit(pick?: MacWindow) {
    if (!this.mode) return;
    this.mode = null;
    this.hover(null);
    this.catcher.remove();
    play('expose', 0.6);
    for (const w of this.wm.windows) {
      w.el.style.transform = '';
      w.el.classList.remove('expose-dim');
    }
    if (pick) {
      this.wm.restore(pick);
      this.wm.focus(pick);
    }
    this.timer = window.setTimeout(() => this.layer.classList.remove('expose', 'expose-all', 'expose-app', 'expose-desktop'), MS);
  }

  /** A grid that suits the screen's shape; each window shrinks (never grows) into its cell, keeping its aspect. */
  private tile(wins: MacWindow[]) {
    const W = this.layer.clientWidth;
    const H = this.layer.clientHeight;
    const top = MENU_H + 24, bottom = 96, side = 24;
    const aw = W - side * 2, ah = H - top - bottom;
    const n = wins.length;
    const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * aw) / ah)) || 1));
    const rows = Math.ceil(n / cols);
    const cw = aw / cols, ch = ah / rows;
    // Keep each window roughly in the same part of the screen it was in: sort by position, row by row.
    const order = [...wins].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
    order.forEach((w, i) => {
      const r = w.rect;
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      const col = i % cols;
      const cx = side + (W - side * 2 - inRow * cw) / 2 + col * cw + cw / 2;
      const cy = top + row * ch + ch / 2;
      const s = Math.min(1, (cw - 28) / r.w, (ch - 36) / r.h);
      w.el.style.transform = `translate(${(cx - (r.x + r.w / 2)).toFixed(1)}px, ${(cy - (r.y + r.h / 2)).toFixed(1)}px) scale(${s.toFixed(3)})`;
    });
  }

  /** Each window slides out past the nearest edges, away from the middle of the screen. */
  private pushAway(wins: MacWindow[]) {
    const W = this.layer.clientWidth;
    const H = this.layer.clientHeight;
    for (const w of wins) {
      const r = w.rect;
      const dx = r.x + r.w / 2 - W / 2;
      const dy = r.y + r.h / 2 - H / 2;
      const tx = dx >= 0 ? W - 18 - r.x : 18 - (r.x + r.w);
      const ty = dy >= 0 ? H - 18 - r.y : 18 - (r.y + r.h);
      w.el.style.transform = `translate(${tx.toFixed(0)}px, ${ty.toFixed(0)}px)`;
    }
  }

  private under(x: number, y: number): MacWindow | null {
    for (let i = this.shown.length - 1; i >= 0; i--) {
      const b = this.shown[i].el.getBoundingClientRect();
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return this.shown[i];
    }
    return null;
  }

  private hover(w: MacWindow | null) {
    if (w === this.hot) return;
    this.hot?.el.classList.remove('expose-hot');
    this.hot = w;
    if (!w) return void this.label.classList.remove('on');
    w.el.classList.add('expose-hot');
    const b = w.el.getBoundingClientRect();
    const host = this.layer.getBoundingClientRect();
    this.label.textContent = w.title || w.app;
    this.label.style.left = `${b.left - host.left + b.width / 2}px`;
    this.label.style.top = `${b.top - host.top + b.height / 2}px`;
    this.label.classList.add('on');
  }
}

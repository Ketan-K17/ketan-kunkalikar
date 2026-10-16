import { el } from './dom';
import { loop, play } from './sound';

export const MENU_H = 25;
export const TITLE_H = 22;
/** Room kept free at the bottom when a window is zoomed, so the dock stays visible. */
const DOCK_ROOM = 84;
const DOCK_ROOM_NARROW = 66;
/** Below this width windows open zoomed: free-floating windows don't work on a phone. */
export const NARROW = 600;

export interface WinOptions {
  /** App that owns the window; the menu bar shows it while the window is focused. */
  app: string;
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  /** Opening a second window with the same key focuses the first instead. */
  key?: string;
  /** Everything below the title bar. Elements marked `data-drag` also drag the window. */
  content: HTMLElement;
  /** SVG string shown in the dock while the window is minimised. */
  icon: string;
  /** Screen rectangle the window grows out of (the icon that was double-clicked). */
  origin?: DOMRect;
  /** Shows `icon` small before the title: the proxy icon of a document or folder window. */
  proxy?: boolean;
  /** Fixed-size panel (About, alerts): no resize handles, zoom disabled. */
  fixed?: boolean;
  /** Toolbar-style window: the title bar and the top of `content` share one gradient (Finder, Preferences). */
  unified?: boolean;
  /** Brushed metal instead of the window colour, when the Aqua style is on (Finder, Calculator, like Tiger). */
  metal?: boolean;
  /** Shows the white pill at the top right of the title bar, which hides and shows the toolbar. */
  onToolbarToggle?: () => void;
  /** Asked before the window closes (e.g. "save changes?"); call `close` to really close it. */
  onCloseRequest?: (close: () => void) => void;
  onClose?: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let seq = 0;

export class MacWindow {
  /** Stable id, used for this window's dock tile while it is minimised. */
  readonly id = ++seq;
  readonly el: HTMLElement;
  readonly titleEl: HTMLElement;
  readonly proxyEl: HTMLElement;
  title: string;
  minimized = false;
  /** Hidden with its app (⌘H). Not on screen and not in the Dock. */
  hidden = false;
  /** The sheet sliding out of the title bar, if one is open; it blocks the window underneath. */
  sheet: HTMLElement | null = null;
  zoomed = false;
  restoreRect: Rect | null = null;
  /** The running genie, kept so minimise/restore mid-flight can reverse it instead of jumping. */
  genie: Animation | null = null;
  genieTimer = 0;

  constructor(readonly opts: WinOptions, el_: HTMLElement, titleEl: HTMLElement, proxyEl: HTMLElement) {
    this.el = el_;
    this.titleEl = titleEl;
    this.proxyEl = proxyEl;
    this.title = opts.title;
  }

  get app() {
    return this.opts.app;
  }

  get rect(): Rect {
    const s = this.el.style;
    return { x: parseFloat(s.left) || 0, y: parseFloat(s.top) || 0, w: parseFloat(s.width) || 0, h: parseFloat(s.height) || 0 };
  }

  set rect(r: Rect) {
    const s = this.el.style;
    s.left = `${r.x}px`;
    s.top = `${r.y}px`;
    s.width = `${r.w}px`;
    s.height = `${r.h}px`;
  }
}

const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const GENIE_MS = 560;
/** Shift-click the minimise button for the slow-motion genie, the old Mac OS X party trick. */
const SLOW = 8;

/** Stacking, focus, drag, resize, minimise (genie) and zoom for the laptop's windows. Plain DOM, pointer events. */
export class WindowManager {
  /** Back to front. */
  readonly windows: MacWindow[] = [];
  private cascade = 0;

  constructor(
    private layer: HTMLElement,
    /** Where a minimised window goes: its dock tile, created by the time this is called. */
    private dockTarget: (win: MacWindow) => DOMRect,
    private onChange: () => void,
  ) {}

  /** The focused window: the front-most one that is not minimised or hidden. */
  get active(): MacWindow | null {
    for (let i = this.windows.length - 1; i >= 0; i--) if (this.onScreen(this.windows[i])) return this.windows[i];
    return null;
  }

  onScreen(w: MacWindow) {
    return !w.minimized && !w.hidden;
  }

  /** Apps with at least one window, in the order they were first opened. */
  get apps(): string[] {
    return [...new Set(this.windows.map((w) => w.app))];
  }

  windowsOf(app: string) {
    return this.windows.filter((w) => w.app === app);
  }

  open(opts: WinOptions): MacWindow {
    const existing = opts.key ? this.windows.find((w) => w.opts.key === opts.key) : undefined;
    if (existing) {
      this.restore(existing);
      this.focus(existing);
      return existing;
    }

    const W = this.layer.clientWidth;
    const H = this.layer.clientHeight;
    const width = Math.min(opts.width, W - 16);
    const height = Math.min(opts.height + TITLE_H, H - MENU_H - DOCK_ROOM + 30);
    const step = (this.cascade++ % 6) * 24;
    const x = Math.max(8, Math.round((W - width) / 2 - 80 + step));
    const y = Math.max(MENU_H + 8, Math.round((H - height) / 2 - 60 + step));

    const titleEl = el('span', { class: 'mac-title-label', text: opts.title });
    const proxyEl = el('span', { class: 'mac-proxy', html: opts.icon });
    const root = el('div', { class: `mac-win${opts.fixed ? ' fixed' : ''}${opts.unified ? ' unified' : ''}${opts.metal ? ' metal' : ''}` });
    const win = new MacWindow(opts, root, titleEl, proxyEl);
    win.rect = { x, y, w: width, h: height };

    const pill = opts.onToolbarToggle
      ? el('button', { class: 'mac-pill', type: 'button', 'aria-label': 'Hide toolbar', onclick: (e: MouseEvent) => (e.stopPropagation(), play('click', 0.6), opts.onToolbarToggle?.()) })
      : null;
    const title = el('div', { class: 'mac-title-text' }, opts.proxy ? proxyEl : null, titleEl);
    root.append(el('div', { class: 'mac-titlebar', 'data-drag': '' }, this.lights(win), title, pill), el('div', { class: 'mac-win-body' }, opts.content));
    if (!opts.fixed) {
      for (const d of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
        const h = el('div', { class: `mac-rz mac-rz-${d}` });
        h.addEventListener('pointerdown', (e) => this.startResize(win, d, e));
        root.append(h);
      }
      root.append(el('div', { class: 'mac-grip' }));
    }
    root.addEventListener('pointerdown', (e) => {
      this.focus(win);
      const t = e.target as Element;
      if (t.closest('[data-drag]') && !t.closest('button, input, a, .mac-lights')) this.startDrag(win, e);
    });
    root.querySelector('.mac-titlebar')!.addEventListener('dblclick', (e) => {
      if (!(e.target as Element).closest('.mac-lights')) this.minimize(win);
    });

    const typing = document.activeElement;
    if (typing instanceof HTMLElement && typing.closest('.mac-win')) typing.blur();
    this.windows.push(win);
    this.layer.append(root);
    if (W < NARROW) this.setZoomed(win, true);
    this.restack();
    play('window-open');
    this.animateOpen(win, opts.origin);
    this.onChange();
    return win;
  }

  focus(win: MacWindow) {
    if (win.hidden) this.showApp(win.app);
    // A text field in the window behind doesn't keep the keyboard, so the Calculator in front gets the keys.
    const typing = document.activeElement;
    if (typing instanceof HTMLElement && typing.closest('.mac-win') && !win.el.contains(typing)) typing.blur();
    if (this.windows[this.windows.length - 1] === win && !win.minimized) {
      this.restack();
      return;
    }
    this.windows.splice(this.windows.indexOf(win), 1);
    this.windows.push(win);
    this.restack();
    this.onChange();
  }

  /** Closes a window, asking it first (`onCloseRequest`) unless `force`. */
  close(win: MacWindow, quiet = false, force = false) {
    const i = this.windows.indexOf(win);
    if (i < 0) return;
    if (!force && win.opts.onCloseRequest) {
      if (win.minimized) this.restore(win);
      this.focus(win);
      return win.opts.onCloseRequest(() => this.close(win, quiet, true));
    }
    this.windows.splice(i, 1);
    if (!quiet) play('window-close');
    win.el.style.pointerEvents = 'none';
    win.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.92)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    // A timer, not onfinish: animations stall in a hidden tab, and a closed window must still go away.
    setTimeout(() => win.el.remove(), 180);
    win.opts.onClose?.();
    this.restack();
    this.onChange();
  }

  closeAll() {
    for (const w of [...this.windows]) this.close(w, true, true);
  }

  /** Quit: closes every window of an app (each may still ask to save). */
  quit(app: string) {
    for (const w of this.windowsOf(app).reverse()) this.close(w);
  }

  /** ⌘H: the app's windows vanish until it is used again. */
  hideApp(app: string) {
    for (const w of this.windowsOf(app)) {
      w.hidden = true;
      w.el.classList.add('hidden');
    }
    this.restack();
    this.onChange();
  }

  showApp(app: string) {
    for (const w of this.windowsOf(app)) {
      w.hidden = false;
      w.el.classList.remove('hidden');
    }
    this.restack();
    this.onChange();
  }

  showAll() {
    for (const app of this.apps) this.showApp(app);
  }

  /** Window > Bring All to Front: the active app's windows move above everything else, keeping their order. */
  bringAllToFront(app: string) {
    const mine = this.windowsOf(app);
    const rest = this.windows.filter((w) => w.app !== app);
    this.windows.splice(0, this.windows.length, ...rest, ...mine);
    this.restack();
    this.onChange();
  }

  /** ⌘`: the next window of the same app comes to the front. */
  cycle() {
    const top = this.active;
    if (!top) return;
    const mine = this.windowsOf(top.app).filter((w) => this.onScreen(w));
    if (mine.length < 2) return;
    this.focus(mine[0]);
  }

  setDirty(win: MacWindow, dirty: boolean) {
    win.el.classList.toggle('dirty', dirty);
  }

  setIcon(win: MacWindow, icon: string) {
    win.opts.icon = icon;
    win.proxyEl.innerHTML = icon;
  }

  /**
   * A sheet: a panel that slides down out of the window's title bar and blocks the window until it is dismissed,
   * the way Aqua asked "Save changes?" and "Empty the Trash?". Returns the function that closes it.
   */
  sheet(win: MacWindow, content: HTMLElement): () => void {
    win.sheet?.remove();
    const cover = el('div', { class: 'mac-sheet-cover' });
    const sheet = el('div', { class: 'mac-sheet' }, content);
    const wrap = el('div', { class: 'mac-sheet-wrap' }, cover, sheet);
    win.el.append(wrap);
    win.sheet = wrap;
    win.el.classList.add('has-sheet');
    play('window-expand', 0.5);
    sheet.animate([{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 260, easing: EASE_OUT });
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      sheet.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => {
        wrap.remove();
        if (win.sheet === wrap) {
          win.sheet = null;
          win.el.classList.remove('has-sheet');
        }
      }, 210);
    };
  }

  minimize(win: MacWindow, slow = false) {
    if (win.minimized) return;
    win.minimized = true;
    // The dock tile for this window appears now, so the genie has somewhere to go.
    this.onChange();
    this.restack();
    play('window-collapse');
    this.runGenie(win, slow);
  }

  restore(win: MacWindow, slow = false) {
    if (!win.minimized) return;
    win.minimized = false;
    play('window-expand');
    // Measure the dock tile before onChange() removes it.
    this.runGenie(win, slow);
    this.focus(win);
    this.onChange();
  }

  /**
   * Plays the genie toward the dock (minimised) or back out of it (restored). Flipping mid-flight reverses the
   * running animation from where it is. Completion also runs on a timer, because animations stall in a hidden tab
   * and a window stuck in `.genie` would ignore every click.
   */
  private runGenie(win: MacWindow, slow = false) {
    const into = win.minimized;
    const running = win.genie && win.genie.playState === 'running' ? win.genie : null;
    let anim: Animation;
    if (running) {
      anim = running;
      if ((anim.playbackRate > 0) !== into) anim.reverse();
    } else {
      win.el.getAnimations().forEach((a) => a.cancel());
      anim = win.el.animate(this.genieFrames(win), { duration: GENIE_MS * (slow ? SLOW : 1), fill: 'both' });
      if (!into) anim.reverse();
      win.genie = anim;
    }
    win.el.classList.remove('minimized');
    win.el.classList.add('genie');

    const done = () => {
      if (win.genie !== anim) return;
      clearTimeout(win.genieTimer);
      win.genie = null;
      win.el.classList.remove('genie');
      win.el.classList.toggle('minimized', win.minimized);
      anim.cancel();
    };
    anim.onfinish = done;
    clearTimeout(win.genieTimer);
    const t = Number(anim.currentTime ?? 0);
    const total = Number(anim.effect?.getTiming().duration ?? GENIE_MS);
    win.genieTimer = window.setTimeout(done, (into ? total - t : t) / Math.abs(anim.playbackRate || 1) + 80);
  }

  toggleZoom(win: MacWindow) {
    if (win.opts.fixed) return;
    play(win.zoomed ? 'window-zoom-min' : 'window-zoom-max');
    win.el.classList.add('animate-size');
    this.setZoomed(win, !win.zoomed);
    setTimeout(() => win.el.classList.remove('animate-size'), 280);
    this.onChange();
  }

  setTitle(win: MacWindow, title: string, icon?: string) {
    win.title = title;
    win.titleEl.textContent = title;
    if (icon) this.setIcon(win, icon);
    this.onChange();
  }

  /**
   * A small live picture of the window, for its Dock tile while minimised (the real Dock shows the window, not
   * the app icon). Iframes are swapped for a grey box so a PDF doesn't load twice.
   */
  thumbnail(win: MacWindow, size: number): HTMLElement {
    const r = win.rect;
    const copy = win.el.cloneNode(true) as HTMLElement;
    copy.classList.remove('minimized', 'genie', 'dragging', 'hidden');
    copy.classList.add('active', 'thumb');
    copy.querySelectorAll('iframe').forEach((f) => f.replaceWith(el('div', { class: 'thumb-frame' })));
    copy.querySelectorAll('.mac-rz, .mac-grip, .mac-sheet-wrap').forEach((n) => n.remove());
    const s = Math.min(size / r.w, size / r.h) * 0.92;
    Object.assign(copy.style, { left: '0', top: '0', position: 'absolute', zIndex: '0', transform: `translate(${((size - r.w * s) / 2).toFixed(1)}px, ${((size - r.h * s) / 2).toFixed(1)}px) scale(${s})`, transformOrigin: '0 0', pointerEvents: 'none' });
    copy.removeAttribute('id');
    return el('div', { class: 'mac-dock-thumb' }, copy, el('div', { class: 'mac-dock-badge', html: win.opts.icon }));
  }

  /** Brief side-to-side shake: "you can't do that". */
  shake(win: MacWindow) {
    play('alert');
    win.el.animate(
      [0, -10, 9, -7, 5, -3, 0].map((dx) => ({ transform: `translateX(${dx}px)` })),
      { duration: 380, easing: 'ease-out' },
    );
  }

  private animateOpen(win: MacWindow, origin?: DOMRect) {
    const r = win.rect;
    const layer = this.layer.getBoundingClientRect();
    let from = 'scale(0.85)';
    if (origin) {
      const s = Math.max(0.05, Math.min(origin.width / r.w, origin.height / r.h));
      const dx = origin.left + origin.width / 2 - layer.left - (r.x + r.w / 2);
      const dy = origin.top + origin.height / 2 - layer.top - (r.y + r.h / 2);
      from = `translate(${dx}px, ${dy}px) scale(${s})`;
    }
    win.el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: origin ? 300 : 200, easing: EASE_OUT });
  }

  /**
   * The genie, sampled into keyframes. The window's sides follow an S-curve that funnels from its own width down
   * to the dock tile: first the bottom edge stretches down the funnel while the curve bends in, then the top edge
   * slides down after it and the whole window drains into the tile. A clip-path draws the funnel; a transform maps
   * the window box onto the funnel's bounding box at each step (so the content squashes as it is sucked in).
   */
  private genieFrames(win: MacWindow): Keyframe[] {
    const r = win.rect;
    const t = this.dockTarget(win);
    const layer = this.layer.getBoundingClientRect();
    const tx = t.left + t.width / 2 - layer.left;
    const tTop = t.top - layer.top + t.height * 0.15;
    const tBot = t.top - layer.top + t.height * 0.85;
    const half = (t.width * 0.8) / 2;
    const span = Math.max(1, tBot - r.y);
    const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
    // Left/right edge of the funnel at height y, with the curve bent in by `bend` (0 = straight window, 1 = funnel).
    const sides = (y: number, bend: number): [number, number] => {
      const s = ease(clamp01((y - r.y) / span)) * bend;
      return [r.x + (tx - half - r.x) * s, r.x + r.w + (tx + half - r.x - r.w) * s];
    };

    const STEPS = 28;
    const ROWS = 14;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const u = i / STEPS;
      const bend = ease(clamp01(u / 0.45));
      const stretch = ease(clamp01((u - 0.1) / 0.45));
      const drain = ease(clamp01((u - 0.35) / 0.65));
      const top = r.y + (tTop - r.y) * drain;
      const bot = Math.max(top + 1, r.y + r.h + (tBot - r.y - r.h) * stretch);

      const left: [number, number][] = [];
      const right: [number, number][] = [];
      let minX = Infinity;
      let maxX = -Infinity;
      for (let k = 0; k <= ROWS; k++) {
        const y = top + ((bot - top) * k) / ROWS;
        const [l, rr] = sides(y, bend);
        left.push([l, y]);
        right.push([rr, y]);
        minX = Math.min(minX, l);
        maxX = Math.max(maxX, rr);
      }
      const bw = Math.max(1, maxX - minX);
      const bh = bot - top;
      const pct = ([x, y]: [number, number]) => `${(((x - minX) / bw) * 100).toFixed(2)}% ${(((y - top) / bh) * 100).toFixed(2)}%`;
      const poly = [...left.map(pct), ...right.reverse().map(pct)].join(', ');
      frames.push({
        offset: u,
        transformOrigin: '0 0',
        transform: `translate(${(minX - r.x).toFixed(2)}px, ${(top - r.y).toFixed(2)}px) scale(${(bw / r.w).toFixed(4)}, ${(bh / r.h).toFixed(4)})`,
        clipPath: `polygon(${poly})`,
        opacity: u < 0.8 ? 1 : 1 - ((u - 0.8) / 0.2) * 0.7,
      });
    }
    return frames;
  }

  private setZoomed(win: MacWindow, on: boolean) {
    if (on === win.zoomed) return;
    if (on) {
      win.restoreRect = win.rect;
      win.rect = { x: 0, y: MENU_H, w: this.layer.clientWidth, h: this.layer.clientHeight - MENU_H - (this.layer.clientWidth < NARROW ? DOCK_ROOM_NARROW : DOCK_ROOM) };
    } else if (win.restoreRect) {
      win.rect = win.restoreRect;
    }
    win.zoomed = on;
    win.el.classList.toggle('zoomed', on);
  }

  private restack() {
    const top = this.active;
    this.windows.forEach((w, i) => {
      w.el.style.zIndex = String(i + 1);
      w.el.classList.toggle('active', w === top);
      w.el.classList.toggle('hidden', w.hidden);
    });
  }

  private lights(win: MacWindow) {
    const btn = (cls: string, label: string, run: (e: MouseEvent) => void) => {
      const b = el('button', { class: `mac-light ${cls}`, 'aria-label': label, type: 'button' });
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        play('button-down', 0.7);
      });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        run(e);
      });
      return b;
    };
    return el(
      'div',
      { class: 'mac-lights' },
      // Option-click closes every window of the app, like the real one.
      btn('close', 'Close', (e) => (e.altKey ? this.quit(win.app) : this.close(win))),
      btn('min', 'Minimise', (e) => this.minimize(win, e.shiftKey)),
      btn('zoom', 'Zoom', () => this.toggleZoom(win)),
    );
  }

  private startDrag(win: MacWindow, e: PointerEvent) {
    if (win.zoomed) return;
    const start = win.rect;
    const sx = e.clientX;
    const sy = e.clientY;
    const el_ = win.el;
    let stopLoop: (() => void) | null = null;
    el_.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => {
      if (!stopLoop && Math.hypot(m.clientX - sx, m.clientY - sy) > 3) {
        stopLoop = loop('window-move');
        el_.classList.add('dragging');
      }
      const W = this.layer.clientWidth;
      const H = this.layer.clientHeight;
      const x = Math.min(W - 60, Math.max(60 - start.w, start.x + m.clientX - sx));
      const y = Math.min(H - 30, Math.max(MENU_H, start.y + m.clientY - sy));
      win.rect = { ...start, x, y };
    };
    const up = () => {
      if (stopLoop) {
        stopLoop();
        play('window-move-stop', 0.8);
      }
      el_.classList.remove('dragging');
      el_.removeEventListener('pointermove', move);
      el_.removeEventListener('pointerup', up);
      el_.removeEventListener('pointercancel', up);
    };
    el_.addEventListener('pointermove', move);
    el_.addEventListener('pointerup', up);
    el_.addEventListener('pointercancel', up);
  }

  private startResize(win: MacWindow, dir: string, e: PointerEvent) {
    if (win.zoomed) return;
    e.stopPropagation();
    this.focus(win);
    const start = win.rect;
    const sx = e.clientX;
    const sy = e.clientY;
    const minW = win.opts.minWidth ?? 280;
    const minH = (win.opts.minHeight ?? 160) + TITLE_H;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const stopLoop = loop('window-resize');
    const move = (m: PointerEvent) => {
      const dx = m.clientX - sx;
      const dy = m.clientY - sy;
      let { x, y, w, h } = start;
      if (dir.includes('e')) w = Math.max(minW, start.w + dx);
      if (dir.includes('s')) h = Math.max(minH, start.h + dy);
      if (dir.includes('w')) {
        w = Math.max(minW, start.w - dx);
        x = start.x + start.w - w;
      }
      if (dir.includes('n')) {
        h = Math.max(minH, start.h - dy);
        y = Math.max(MENU_H, start.y + start.h - h);
        h = start.y + start.h - y;
      }
      win.rect = { x, y, w, h };
    };
    const up = () => {
      stopLoop();
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }
}

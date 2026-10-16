import { el } from './dom';
import { GLYPH } from './icons';
import { prefs, setPrefs } from './prefs';
import { play } from './sound';

export interface MenuItem {
  label: string;
  /** Written the Mac way, modifiers first: `⇧⌘N`, `⌘,`, `F9`. MenuBar.trigger() runs the item when it is pressed. */
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  /** Small SVG before the label (Recent Items). */
  icon?: string;
  run?: () => void;
  /** Opens to the side, like Apple > Recent Items. */
  submenu?: MenuEntry[];
}
export type MenuEntry = MenuItem | 'sep';

export interface Menu {
  title: string;
  /** The Apple menu: shown as the logo. */
  apple?: boolean;
  /** The application-name menu, drawn bold. */
  bold?: boolean;
  /** Dropped on narrow screens to make room. */
  optional?: boolean;
  /** Replaces the title with markup (menu extras: battery, AirPort). `title` stays the accessible name. */
  html?: string;
  items: MenuEntry[];
}

export interface StatusHandlers {
  /** The speaker icon was clicked; `anchor` is the icon, for placing the popover. */
  volume(anchor: HTMLElement): void;
  spotlight(anchor: HTMLElement): void;
  /** Clock menu > Open Date & Time… */
  dateTime(): void;
}

const fmtDay = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
/** How long a chosen item blinks before its menu fades, like the classic Mac. */
const BLINK_MS = 210;
/** `openIdx` while a right-click menu is showing. */
const CONTEXT = -2;

/** Does a key press match a shortcut like `⇧⌘N`? Ctrl counts as ⌘ too, since the browser keeps some ⌘ keys for itself. */
function matches(sc: string, e: KeyboardEvent) {
  const cmd = e.metaKey || e.ctrlKey;
  if (sc.includes('⌘') !== cmd || sc.includes('⇧') !== e.shiftKey || sc.includes('⌥') !== e.altKey) return false;
  const key = sc.replace(/[⌘⇧⌥⌃]/g, '');
  const code: Record<string, string[]> = { '⌫': ['Backspace', 'Delete'], '↑': ['ArrowUp'], '↓': ['ArrowDown'], '⎋': ['Escape'], ',': ['Comma'], '[': ['BracketLeft'], ']': ['BracketRight'], '`': ['Backquote'], '␣': ['Space'] };
  if (code[key]) return code[key].includes(e.code);
  if (/^F\d+$/.test(key)) return e.code === key;
  if (/^\d$/.test(key)) return e.code === `Digit${key}`;
  return e.code === `Key${key.toUpperCase()}`;
}

/** One drop-down list. The menu bar has two (the menu and its open submenu), so a backdrop-filter is never nested. */
class Panel {
  readonly el = el('div', { class: 'mac-dropdown', role: 'menu' });
  rows: { row: HTMLElement; item: MenuItem }[] = [];
  hot = -1;

  constructor(private bar: MenuBar, private depth: number) {}

  show(items: MenuEntry[], x: number, y: number, alignRight = false, above = false) {
    this.rows = [];
    this.hot = -1;
    this.el.replaceChildren(
      ...items.map((it) => {
        if (it === 'sep') return el('div', { class: 'mac-sep' });
        const row = el(
          'button',
          { class: `mac-item${it.disabled ? ' disabled' : ''}${it.submenu ? ' has-sub' : ''}`, type: 'button', role: 'menuitem', disabled: it.disabled ? '' : null },
          el('span', { class: 'mac-check', text: it.checked ? '✓' : '' }),
          it.icon ? el('span', { class: 'mac-item-ico', html: it.icon }) : null,
          el('span', { class: 'mac-item-label', text: it.label }),
          el('span', { class: 'mac-item-key', text: it.submenu ? '▸' : (it.shortcut ?? '') }),
        );
        const k = this.rows.length;
        this.rows.push({ row, item: it });
        row.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse') return;
          this.setHot(k);
          if (!it.disabled) play('menu-hover', 0.6);
          if (it.submenu && !it.disabled) this.bar.openSub(this, k);
          else this.bar.closeSub(this);
        });
        row.addEventListener('click', () => {
          if (it.disabled) return;
          if (it.submenu) return this.bar.openSub(this, k);
          this.bar.choose(row, it);
        });
        return row;
      }),
    );
    this.el.classList.add('open');
    this.el.style.zIndex = String(3100 + this.depth);
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const left = alignRight ? x - w : x;
    if (above) y -= h;
    this.el.style.left = `${Math.max(4, Math.min(left, window.innerWidth - w - 4))}px`;
    this.el.style.top = `${Math.max(0, Math.min(y, window.innerHeight - h - 4))}px`;
  }

  hide() {
    this.el.classList.remove('open');
    this.hot = -1;
  }

  get isOpen() {
    return this.el.classList.contains('open');
  }

  setHot(k: number) {
    this.hot = k;
    this.rows.forEach((r, i) => r.row.classList.toggle('hot', i === k));
  }

  /** Arrow keys: step to the next item that isn't disabled. */
  step(d: 1 | -1) {
    const n = this.rows.length;
    for (let i = 1; i <= n; i++) {
      const k = (((this.hot < 0 ? (d > 0 ? -1 : n) : this.hot) + d * i) % n + n) % n;
      if (!this.rows[k].item.disabled) return this.setHot(k);
    }
  }
}

/**
 * The menu bar: the menus on the left, menu extras on the right (user, AirPort, battery, volume, clock, Spotlight),
 * their drop-downs with submenus, right-click menus (`popup`), keyboard navigation and shortcuts (`trigger`).
 * The panels are separate elements (not children of `el`) because a backdrop-filter nested inside another one stops blurring.
 */
export class MenuBar {
  readonly el: HTMLElement;
  /** The menu panel and its submenu; MacScreen puts these in the page. */
  readonly popups: HTMLElement[];
  private left: HTMLElement;
  private extrasEl: HTMLElement;
  private clock: HTMLButtonElement;
  private speaker: HTMLButtonElement;
  private menus: Menu[] = [];
  private extras: Menu[] = [];
  private titles: HTMLElement[] = [];
  private panel = new Panel(this, 0);
  private sub = new Panel(this, 1);
  private subOf = -1;
  private openIdx = -1;
  private timer = 0;
  private blinking = false;
  /** Runs just before a menu opens or a shortcut is matched, so items are enabled for what is true right now. */
  beforeOpen: (() => void) | null = null;

  constructor(private status: StatusHandlers) {
    this.left = el('div', { class: 'mac-mb-left' });
    this.extrasEl = el('div', { class: 'mac-mb-extras' });
    this.clock = el('button', { class: 'mac-mi mac-mb-clock', type: 'button', 'aria-label': 'Clock' });
    this.speaker = el('button', { class: 'mac-mb-ico', type: 'button', 'aria-label': 'Volume', html: GLYPH.speaker });
    this.speaker.addEventListener('click', () => status.volume(this.speaker));
    const search = el('button', { class: 'mac-mb-ico spot-btn', type: 'button', 'aria-label': 'Spotlight', html: GLYPH.search });
    search.addEventListener('click', () => status.spotlight(search));
    this.el = el('div', { class: 'mac-menubar' }, this.left, el('div', { class: 'mac-mb-right' }, this.extrasEl, this.speaker, this.clock, search));
    this.popups = [this.panel.el, this.sub.el];
    // Keep the keyboard focus where it was (a text field), so Edit > Copy works on it.
    for (const e of [this.el, ...this.popups]) e.addEventListener('mousedown', (m) => m.preventDefault());

    // A press anywhere that is not a menu title or an open panel closes the menu.
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (this.openIdx === -1) return;
        const t = e.target as Element;
        if (!t.closest('.mac-mi') && !t.closest('.mac-dropdown')) this.closeMenus();
      },
      true,
    );
  }

  /** The app's menus (left) and the status menus (right). Re-rendered whenever windows or prefs change. */
  setMenus(menus: Menu[], extras: Menu[] = this.extras) {
    this.menus = menus;
    this.extras = extras;
    this.renderTitles();
    if (this.openIdx >= 0 && !this.blinking) this.renderPanel();
  }

  setMuted(muted: boolean) {
    this.speaker.innerHTML = muted ? GLYPH.speakerOff : GLYPH.speaker;
  }

  /** Returns true when a menu was open (so Esc can be consumed). */
  closeMenus(sound = true): boolean {
    if (this.openIdx === -1) return false;
    this.openIdx = -1;
    this.titles.forEach((t) => t.classList.remove('open'));
    this.panel.hide();
    this.sub.hide();
    this.subOf = -1;
    if (sound) play('menu-close');
    return true;
  }

  get hasOpenMenu() {
    return this.openIdx !== -1;
  }

  /** A right-click menu at a point on screen; `above` opens it upwards (Dock menus), centred on `x`. */
  popup(x: number, y: number, items: MenuEntry[], above = false) {
    this.closeMenus(false);
    play('menu-open');
    this.openIdx = CONTEXT;
    this.panel.show(items, x, y, false, above);
    if (above) this.panel.el.style.left = `${Math.max(4, Math.min(x - this.panel.el.offsetWidth / 2, window.innerWidth - this.panel.el.offsetWidth - 4))}px`;
    this.panel.el.classList.add('context');
  }

  startClock() {
    this.tick();
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 10_000);
  }

  stopClock() {
    window.clearInterval(this.timer);
  }

  /** Runs the menu item whose shortcut matches this key press, flashing its menu title like the real thing. */
  trigger(e: KeyboardEvent): boolean {
    this.beforeOpen?.();
    const find = (items: MenuEntry[]): MenuItem | undefined => {
      for (const it of items) {
        if (it === 'sep') continue;
        if (it.submenu) {
          const s = find(it.submenu);
          if (s) return s;
        } else if (it.shortcut && matches(it.shortcut, e)) return it;
      }
    };
    for (let i = 0; i < this.menus.length; i++) {
      const it = find(this.menus[i].items);
      if (!it) continue;
      e.preventDefault();
      if (it.disabled) {
        play('alert');
        return true;
      }
      const t = this.titles[i];
      t?.classList.add('open');
      setTimeout(() => t?.classList.remove('open'), 140);
      play('menu-click', 0.7);
      it.run?.();
      return true;
    }
    return false;
  }

  /** Arrow keys, Enter and Esc while a menu is open. Returns true when the key was used. */
  key(e: KeyboardEvent): boolean {
    if (this.openIdx === -1 || this.blinking) return false;
    const p = this.sub.isOpen && this.sub.hot >= 0 ? this.sub : this.panel;
    const all = this.menus.length + this.extras.length;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        p.step(e.key === 'ArrowDown' ? 1 : -1);
        if (p === this.panel) this.closeSub(this.panel);
        break;
      case 'ArrowRight':
        if (p === this.panel && this.panel.rows[this.panel.hot]?.item.submenu) {
          this.openSub(this.panel, this.panel.hot);
          this.sub.step(1);
        } else if (this.openIdx >= 0) this.openMenu((this.openIdx + 1) % all);
        break;
      case 'ArrowLeft':
        if (p === this.sub) {
          this.sub.hide();
          this.subOf = -1;
        } else if (this.openIdx >= 0) this.openMenu((this.openIdx - 1 + all) % all);
        break;
      case 'Enter':
      case ' ': {
        const r = p.rows[p.hot];
        if (r && !r.item.disabled) {
          if (r.item.submenu) {
            this.openSub(p, p.hot);
            this.sub.step(1);
          } else this.choose(r.row, r.item);
        }
        break;
      }
      default:
        return false;
    }
    e.preventDefault();
    return true;
  }

  /** Called by a panel when the pointer rests on an item with a submenu. */
  openSub(from: Panel, k: number) {
    if (from !== this.panel) return;
    if (this.subOf === k && this.sub.isOpen) return;
    const r = from.rows[k];
    if (!r?.item.submenu) return;
    this.subOf = k;
    const box = r.row.getBoundingClientRect();
    const right = box.right + 230 > window.innerWidth;
    this.sub.show(r.item.submenu, right ? box.left + 2 : box.right - 2, box.top - 4, right);
  }

  closeSub(from: Panel) {
    if (from !== this.panel || !this.sub.isOpen) return;
    this.sub.hide();
    this.subOf = -1;
  }

  /** The chosen item blinks, then the menu fades and the command runs. */
  choose(row: HTMLElement, it: MenuItem) {
    if (this.blinking) return;
    this.blinking = true;
    play('menu-click');
    row.classList.add('blink');
    const panels = [this.panel, this.sub];
    panels.forEach((p) => p.el.classList.add('chosen'));
    setTimeout(() => {
      this.blinking = false;
      panels.forEach((p) => {
        p.el.classList.remove('chosen');
        if (p.isOpen) p.el.classList.add('fading');
      });
      this.closeMenus(false);
      setTimeout(() => panels.forEach((p) => p.el.classList.remove('fading', 'context')), 200);
      it.run?.();
    }, BLINK_MS);
  }

  private tick() {
    const d = new Date();
    if (prefs.analogClock) {
      const m = d.getMinutes(), h = (d.getHours() % 12) + m / 60;
      const hand = (deg: number, len: number, w: number) =>
        `<line x1="8" y1="8" x2="${(8 + Math.sin((deg * Math.PI) / 180) * len).toFixed(2)}" y2="${(8 - Math.cos((deg * Math.PI) / 180) * len).toFixed(2)}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
      this.clock.innerHTML = `<span class="mac-aclock"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.2"/>${hand(h * 30, 3.6, 1.5)}${hand(m * 6, 5.2, 1)}</svg></span>`;
    } else {
      this.clock.textContent = `${fmtDay.format(d)} ${fmtTime.format(d)}`;
    }
  }

  private clockMenu(): Menu {
    return {
      title: 'Clock',
      items: [
        { label: fmtLong.format(new Date()), disabled: true },
        'sep',
        { label: 'View as Analog', checked: prefs.analogClock, run: () => (setPrefs({ analogClock: true }), this.tick()) },
        { label: 'View as Digital', checked: !prefs.analogClock, run: () => (setPrefs({ analogClock: false }), this.tick()) },
        'sep',
        { label: 'Open Date & Time…', run: () => this.status.dateTime() },
      ],
    };
  }

  private renderTitles() {
    const all = [...this.menus, ...this.extras];
    const title = (m: Menu, i: number) => {
      const cls = ['mac-mi', m.bold ? 'bold' : '', m.apple ? 'apple' : '', m.optional ? 'opt' : '', m.html ? 'extra' : '', i === this.openIdx ? 'open' : ''].filter(Boolean).join(' ');
      const b = el(
        'button',
        { class: cls, type: 'button', 'aria-label': m.apple ? 'Apple menu' : m.title, 'aria-haspopup': 'menu' },
        m.apple ? el('span', { class: 'mac-apple', html: GLYPH.apple }) : m.html ? el('span', { class: 'mac-extra', html: m.html }) : m.title,
      );
      this.wire(b, i);
      return b;
    };
    this.titles = all.map(title);
    this.left.replaceChildren(...this.titles.slice(0, this.menus.length));
    this.extrasEl.replaceChildren(...this.titles.slice(this.menus.length));
    // The clock is a menu too, kept last among the titles.
    this.titles.push(this.clock);
    if (!this.clock.dataset.wired) {
      this.clock.dataset.wired = '1';
      this.wire(this.clock, -3);
    }
    this.clock.classList.toggle('open', this.openIdx === this.clockIdx);
  }

  private get clockIdx() {
    return this.menus.length + this.extras.length;
  }

  private wire(b: HTMLElement, i: number) {
    const idx = () => (i === -3 ? this.clockIdx : i);
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.openIdx === idx() ? this.closeMenus() : this.openMenu(idx());
    });
    // While a menu is open, moving across the bar switches menus like the real thing.
    b.addEventListener('pointerenter', (e) => {
      if (this.openIdx >= 0 && this.openIdx !== idx() && e.pointerType === 'mouse' && !this.blinking) this.openMenu(idx());
    });
  }

  private menuAt(i: number): Menu | undefined {
    if (i === this.clockIdx) return this.clockMenu();
    return [...this.menus, ...this.extras][i];
  }

  private openMenu(i: number) {
    if (this.openIdx < 0) {
      this.beforeOpen?.();
      if (i >= this.menus.length + this.extras.length + 1) return;
    }
    if (this.openIdx < 0) play('menu-open');
    else play('menu-hover');
    this.panel.el.classList.remove('context');
    this.openIdx = i;
    this.titles.forEach((t, k) => t.classList.toggle('open', k === i));
    this.renderPanel();
  }

  private renderPanel() {
    const m = this.menuAt(this.openIdx);
    if (!m) return this.closeMenus(false);
    this.sub.hide();
    this.subOf = -1;
    const rect = this.titles[this.openIdx]?.getBoundingClientRect();
    const onRight = this.openIdx >= this.menus.length;
    const top = (rect?.bottom ?? 22) - 1;
    this.panel.show(m.items, onRight ? (rect?.right ?? 0) : (rect?.left ?? 0), top, onRight);
  }
}

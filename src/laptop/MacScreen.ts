import './mac.css';
import { Calculator } from './apps/Calculator';
import { Mail } from './apps/Mail';
import { Terminal } from './apps/Terminal';
import { TextDoc } from './apps/TextEdit';
import { onSystemScheme, resolveLook } from './appearance';
import { BootScreens, wait } from './Boot';
import { Dashboard } from './Dashboard';
import { DESKTOP, USER, type DesktopApp, type DesktopFile, type DesktopFolder, type DesktopNode } from './desktop';
import { Dock, dockIconSize, type DockEntry } from './Dock';
import { el } from './dom';
import { Expose } from './Expose';
import { FinderView, DOUBLE_MS, type Loc } from './Finder';
import {
  canTrash, clearIconSpots, clearRecent, emptyTrash, iconSpot, isPresent, moveToTrash, noteRecent, onFsChange, pathOf, putBack, recentItems, setIconSpot, SYSTEM_APPS, trailTo, trashItems,
} from './fs';
import { helpTags } from './HelpTags';
import { CURSOR, DEFS, GLYPH, ICON, appIcon, nodeIcon } from './icons';
import { MenuBar, type Menu, type MenuEntry, type MenuItem } from './MenuBar';
import { extraMenus, watchExtras } from './MenuExtras';
import { MusicPlayer } from './MusicPlayer';
import { getInfo, systemProfiler } from './Panels';
import { onPrefs, prefs, setPrefs } from './prefs';
import { PrefsView, type Pane } from './PrefsView';
import { ScreenSaver } from './ScreenSaver';
import { applyVolume, play, preloadSounds } from './sound';
import { Spotlight } from './Spotlight';
import { MacWindow, WindowManager, type WinOptions } from './Windows';

/** One icon on the desktop: Macintosh HD, then the owner's folders and files (apps live in the Dock). */
interface DeskItem {
  key: string;
  name: string;
  icon: string;
  node: DesktopNode | null;
  open(origin: DOMRect): void;
}

/** A button in an alert or sheet. `left` puts it apart on the left, like "Don't Save". */
interface Btn {
  label: string;
  run?: () => void;
  default?: boolean;
  cancel?: boolean;
  left?: boolean;
}

/** The app's own windows that take the keyboard: Calculator keys, Terminal's prompt. */
interface KeyedApp {
  onKey?(e: KeyboardEvent): boolean;
  focus?(): void;
}

/** Built-in apps the Dock always shows, by SYSTEM_APPS id, before and after the owner's apps. */
const DOCK_BEFORE = ['mail', 'dashboard'];
const DOCK_AFTER = ['calculator', 'terminal', 'prefs'];
/** How long the Dock bounces and the beach ball spins for an app the real computer opens. */
const LAUNCH_MS = 1600;
/** Desktop icons move once the pointer has travelled this far, so a click is still a click. */
const DRAG_PX = 5;

const SHORTCUTS: [string, string][] = [
  ['⌘N', 'New Finder window (or a new Terminal window)'],
  ['⌘O / ⌘↓', 'Open the selection'],
  ['⌘W', 'Close the window'],
  ['⌘I', 'Get Info'],
  ['⌘⌫', 'Move to Trash'],
  ['⇧⌘⌫', 'Empty Trash'],
  ['⌘1 / ⌘2 / ⌘3', 'Icons, list, columns'],
  ['⌘[ / ⌘] / ⌘↑', 'Back, forward, enclosing folder'],
  ['⇧⌘C / ⇧⌘D / ⇧⌘A', 'Computer, Desktop, Applications'],
  ['⌘M', 'Minimise (hold ⇧ when clicking for slow motion)'],
  ['⌘H / ⌥⌘H', 'Hide the app / hide the others'],
  ['⌘Q', 'Quit the app'],
  ['⌘S', 'Save a TextEdit document'],
  ['⌘`', 'Next window of the same app'],
  ['⌥⌘⎋', 'Force Quit'],
  ['F9 / F10 / F11', 'Exposé: all windows, app windows, desktop'],
  ['F12', 'Dashboard'],
  ['Ctrl instead of ⌘', 'Works for every shortcut (the browser keeps some ⌘ keys)'],
];

/**
 * The portfolio's screen: an Aqua-era Mac OS X desktop in HTML/CSS over the whole page. The tear-off cover
 * (`src/components/TearOff.tsx`) only calls `open(onClose)`; everything else (menu bar, dock, windows, Finder, apps,
 * preferences, sounds) lives in this folder. Contents come from `desktop.ts`. It is a singleton (see `macScreen()`).
 * There is no lid: only Shut Down closes it (and `onClose` puts the old site back on top).
 */
export class MacScreen {
  private root: HTMLElement;
  private wall: HTMLElement;
  private desktop: HTMLElement;
  private band: HTMLElement;
  private screens: BootScreens;
  private blackout: HTMLElement;
  private volume: HTMLElement;
  private volumeSlider: HTMLInputElement;
  private menubar: MenuBar;
  private dock = new Dock();
  private spotlight: Spotlight;
  private wm: WindowManager;
  private expose: Expose;
  private dashboard = new Dashboard();
  private saver = new ScreenSaver();
  private finders = new Map<MacWindow, FinderView>();
  private docs = new Map<MacWindow, TextDoc>();
  private keyed = new Map<MacWindow, KeyedApp>();
  private prefsWin: MacWindow | null = null;
  private prefsView: PrefsView | null = null;
  private music = new MusicPlayer();
  /** The alert or sheet in front, which Enter and Esc answer. */
  private modal_: { ok: () => void; cancel: () => void; close: () => void; win: MacWindow } | null = null;
  private items: DeskItem[] = [];
  private deskEls: HTMLElement[] = [];
  private deskSel = new Set<number>();
  private deskLast = { i: -1, t: 0 };
  private typed = { text: '', t: 0 };
  private onClose: (() => void) | null = null;
  private asleep = false;
  /** True until the first start, and again after Shut Down: the next open plays the boot sequence. */
  private off = true;
  private busy = false;
  private lastInput = performance.now();
  private idleTimer = 0;
  private spinTimer = 0;
  private spinUntil = 0;

  constructor() {
    this.menubar = new MenuBar({ volume: (a) => this.toggleVolume(a), spotlight: (a) => this.spotlight.toggle(a), dateTime: () => this.openPrefs('datetime') });
    this.menubar.beforeOpen = () => this.refreshChrome();
    this.spotlight = new Spotlight((n, origin) => this.openNode(n, origin));
    this.wall = el('div', { class: 'mac-wall' });
    this.band = el('div', { class: 'mac-band' });
    this.desktop = el('div', { class: 'mac-desktop' });
    this.desktop.addEventListener('pointerdown', (e) => this.startBand(e));
    this.desktop.addEventListener('contextmenu', (e) => this.desktopMenu(e));
    const winLayer = el('div', { class: 'mac-winlayer' });

    this.volumeSlider = el('input', { class: 'aq-slider vertical', type: 'range', min: '0', max: '1', step: '0.05', 'aria-label': 'Volume' });
    this.volumeSlider.addEventListener('input', () => setPrefs({ volume: Number(this.volumeSlider.value), muted: false }));
    this.volumeSlider.addEventListener('change', () => play('volume'));
    this.volume = el('div', { class: 'mac-popover vol' }, this.volumeSlider);

    this.screens = new BootScreens({
      sleep: () => void this.powerDown('sleep'),
      restart: () => void this.powerDown('restart'),
      shutdown: () => void this.powerDown('shutdown'),
    });
    this.blackout = el('div', { class: 'mac-blackout' });
    this.root = el(
      'div',
      { class: 'mac-root', 'aria-hidden': 'true' },
      el('div', { html: DEFS }),
      this.wall,
      this.desktop,
      this.music.el,
      this.band,
      winLayer,
      this.dashboard.el,
      this.menubar.el,
      ...this.menubar.popups,
      this.volume,
      this.spotlight.el,
      this.dock.el,
      this.saver.el,
      this.screens.el,
      this.blackout,
    );
    this.root.style.setProperty('--arrow', CURSOR.arrow);
    document.body.append(this.root);
    helpTags(this.root);

    // Clicks outside a popover close it.
    document.addEventListener(
      'pointerdown',
      (e) => {
        const t = e.target as Element;
        if (!t.closest('.mac-popover') && !t.closest('.mac-mb-ico')) {
          this.volume.classList.remove('open');
          this.spotlight.hide();
        }
      },
      true,
    );
    // Sleep ends with the first click.
    this.root.addEventListener('pointerdown', (e) => this.asleep && (e.stopPropagation(), e.preventDefault(), this.wake()), true);
    // Anything the owner does counts as "not idle" for the screen saver.
    for (const ev of ['pointermove', 'pointerdown', 'wheel'] as const) this.root.addEventListener(ev, () => (this.lastInput = performance.now()), { passive: true });

    this.wm = new WindowManager(winLayer, (w) => this.dock.rectOf(`min:${w.id}`), () => this.refreshChrome());
    this.expose = new Expose(this.wm, winLayer);
    onPrefs(() => this.applyPrefs());
    onSystemScheme(() => void this.applyLook());
    onFsChange(() => {
      this.renderDesktop();
      for (const [w, f] of this.finders) {
        f.refresh();
        this.wm.setIcon(w, f.icon());
      }
      this.refreshChrome();
    });
    watchExtras(() => this.refreshChrome());
    this.applyPrefs();
    this.renderDesktop();
    this.refreshChrome();
  }

  get isOpen() {
    return this.root.classList.contains('open');
  }

  /**
   * Shows the laptop. `onClose` runs once when it is shut again, by any route. Opening skips the start-up screens
   * and chime: the wallpaper shows at once and the desktop assembles when `ready` resolves (the torn page falling
   * away). Restart still plays the whole boot.
   */
  open(onClose: () => void, ready: Promise<unknown> = Promise.resolve()) {
    if (this.isOpen) return;
    this.onClose = onClose;
    this.refreshChrome();
    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('open');
    this.menubar.startClock();
    this.music.wake();
    void preloadSounds();
    this.lastInput = performance.now();
    this.idleTimer = window.setInterval(() => this.checkIdle(), 5000);
    if (this.off) {
      this.off = false;
      this.busy = true;
      this.root.classList.add('booting');
      this.blackout.classList.remove('on');
      void ready.then(() => this.arrive());
    }
    // One tick later, so the key press that opened it can't also close it.
    setTimeout(() => window.addEventListener('keydown', this.onKey, true), 0);
  }

  /** Out of Sleep: the blackout fades and everything is where it was. */
  private wake() {
    this.asleep = false;
    this.blackout.classList.remove('on');
    this.lastInput = performance.now();
    window.clearInterval(this.idleTimer);
    this.idleTimer = window.setInterval(() => this.checkIdle(), 5000);
  }

  close() {
    if (!this.isOpen) return;
    this.asleep = false;
    window.removeEventListener('keydown', this.onKey, true);
    window.clearInterval(this.idleTimer);
    this.saver.stop();
    this.expose.exit();
    this.dashboard.hide();
    this.menubar.closeMenus(false);
    this.menubar.stopClock();
    this.music.sleep();
    this.volume.classList.remove('open');
    this.spotlight.hide();
    this.root.classList.remove('open');
    this.root.setAttribute('aria-hidden', 'true');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  // ---------- Power ----------

  /** Grey Apple, chime and spinner, the "Mac OS X" progress panel, then the desktop assembles itself. */
  private async bootUp() {
    this.off = false;
    this.busy = true;
    this.root.classList.add('booting');
    this.blackout.classList.remove('on');
    // Give the owner's boot sound a moment to load; fall back to the built-in chime.
    await Promise.race([preloadSounds(), wait(600)]);
    await this.screens.startUp();
    await this.arrive();
  }

  /** Menu bar fades in, desktop icons pop in one by one, the Dock slides up. */
  private async arrive() {
    this.root.classList.remove('booting');
    this.root.classList.add('arriving');
    this.deskEls.forEach((d, i) => d.style.setProperty('--n', String(i)));
    await wait(700 + this.deskEls.length * 60);
    this.root.classList.remove('arriving');
    this.busy = false;
  }

  /** Before quitting everything: each unsaved document asks first. False if the owner pressed Cancel. */
  private async saveAll(): Promise<boolean> {
    for (const [w, d] of [...this.docs]) {
      if (!d.dirty) continue;
      const ok = await new Promise<boolean>((resolve) => this.askSave(w, d, () => resolve(true), () => resolve(false)));
      if (!ok) return false;
    }
    return true;
  }

  /** Sleep keeps your windows; Shut Down closes them all and boots again next time; Restart boots right away. */
  private async powerDown(mode: 'sleep' | 'restart' | 'shutdown' | 'logout') {
    if (this.busy) return;
    if (mode !== 'sleep' && !(await this.saveAll())) return;
    this.busy = true;
    this.dashboard.hide();
    this.expose.exit();
    if (mode !== 'sleep') {
      if (mode !== 'logout') this.music.pause();
      this.wm.closeAll();
      this.selectDesktop([]);
      this.root.classList.add('leaving');
      await wait(450);
    }
    if (mode === 'logout') {
      this.root.classList.remove('leaving');
      this.root.classList.add('booting');
      this.busy = false;
      await this.screens.logOut();
      this.busy = true;
      return void this.arrive();
    }
    if (mode !== 'sleep' && !this.screens.loggedOut) await this.screens.shutDown();
    this.blackout.classList.add('on');
    await wait(mode === 'sleep' ? 350 : 600);
    this.root.classList.remove('leaving');
    // Asleep at the login window, it is still the login window when it wakes.
    if (mode !== 'sleep') this.screens.hide();
    this.busy = false;
    if (mode === 'restart') return void this.bootUp();
    if (mode === 'shutdown') {
      this.off = true;
      this.close();
      this.blackout.classList.remove('on');
      return;
    }
    // Asleep: the screen stays dark until the next click or key, like a real one.
    this.asleep = true;
    this.saver.stop();
    window.clearInterval(this.idleTimer);
  }

  private confirmPower(mode: 'restart' | 'shutdown' | 'logout') {
    const verb = { restart: 'Restart', shutdown: 'Shut Down', logout: 'Log Out' }[mode];
    const what = { restart: 'restart your computer', shutdown: 'shut down your computer', logout: 'quit all applications and log out' }[mode];
    this.alert({
      title: `Are you sure you want to ${what} now?`,
      text: (n) => `If you do nothing, the computer will ${mode === 'logout' ? 'log out' : verb.toLowerCase()} automatically in ${n} seconds.`,
      countdown: 120,
      icon: mode === 'logout' ? ICON.user : ICON.laptop,
      buttons: [{ label: 'Cancel', cancel: true }, { label: verb, default: true, run: () => void this.powerDown(mode) }],
    });
  }

  // ---------- Alerts and sheets ----------

  /** The alert or sheet in front, if its window is still open (Shut Down may have closed it). */
  private get modal() {
    if (this.modal_ && !this.wm.windows.includes(this.modal_.win)) this.modal_ = null;
    return this.modal_;
  }

  /** The inside of an alert or sheet: icon, bold question, small print, buttons. */
  private dialogBox(o: { title: string; text: string; icon: string; buttons: Btn[] }, done: (b: Btn) => void) {
    const btn = (b: Btn) => el('button', { class: `aq-btn${b.default ? ' default' : ''}`, type: 'button', text: b.label, onclick: () => done(b) });
    const left = o.buttons.filter((b) => b.left);
    const right = o.buttons.filter((b) => !b.left);
    const textEl = el('div', { class: 'mac-alert-text', text: o.text });
    const box = el(
      'div',
      { class: 'mac-alert', 'data-drag': '' },
      el('div', { class: 'mac-alert-ico', html: o.icon }),
      el('div', { class: 'mac-alert-main' }, el('div', { class: 'mac-alert-title', text: o.title }), textEl, el('div', { class: 'mac-alert-btns' }, ...left.map(btn), el('span', { class: 'mac-alert-gap' }), ...right.map(btn))),
    );
    return { box, textEl };
  }

  /** A small modal alert with a pulsing default button (Enter) and Cancel (Esc), the way Aqua did it. */
  private alert(o: { title: string; text: string | ((n: number) => string); icon?: string; buttons?: Btn[]; countdown?: number }) {
    this.modal?.close();
    const buttons = o.buttons ?? [{ label: 'OK', default: true }];
    let n = o.countdown ?? 0;
    const text = () => (typeof o.text === 'function' ? o.text(n) : o.text);
    let timer = 0;
    let win: MacWindow | null = null;
    const finish = (b: Btn | null) => {
      if (!win) return;
      clearInterval(timer);
      const w = win;
      win = null;
      if (this.modal_?.close === close) this.modal_ = null;
      this.wm.close(w, true, true);
      if (b) {
        play('button-up', 0.7);
        b.run?.();
      }
    };
    const close = () => finish(null);
    const { box, textEl } = this.dialogBox({ title: o.title, text: text(), icon: o.icon ?? ICON.caution, buttons }, finish);
    win = this.openWin({ app: this.wm.active?.app ?? 'Finder', title: '', width: 440, height: 140, fixed: true, key: 'alert', content: box, icon: o.icon ?? ICON.caution, onClose: () => clearInterval(timer) });
    win.el.classList.add('alert');
    const def = buttons.find((b) => b.default) ?? buttons[buttons.length - 1];
    const cancel = buttons.find((b) => b.cancel);
    this.modal_ = { ok: () => finish(def), cancel: () => finish(cancel ?? null), close, win };
    if (o.countdown) {
      timer = window.setInterval(() => {
        n--;
        textEl.textContent = text();
        if (n <= 0) finish(def);
      }, 1000);
    }
    play('alert');
  }

  /** A sheet on `win`: slides out of its title bar and blocks it until a button is pressed. */
  private sheet(win: MacWindow, o: { title: string; text: string; icon: string; buttons: Btn[] }) {
    this.modal?.close();
    let shut: (() => void) | null = null;
    const finish = (b: Btn | null) => {
      if (!shut) return;
      shut();
      shut = null;
      if (this.modal_?.close === close) this.modal_ = null;
      if (b) {
        play('button-up', 0.7);
        b.run?.();
      }
    };
    const close = () => finish(null);
    const { box } = this.dialogBox(o, finish);
    box.removeAttribute('data-drag');
    shut = this.wm.sheet(win, box);
    const def = o.buttons.find((b) => b.default) ?? o.buttons[o.buttons.length - 1];
    this.modal_ = { ok: () => finish(def), cancel: () => finish(o.buttons.find((b) => b.cancel) ?? null), close, win };
    play('alert', 0.6);
  }

  /** TextEdit's "Do you want to save the changes…?" sheet. */
  private askSave(win: MacWindow, doc: TextDoc, proceed: () => void, cancelled = () => {}) {
    this.wm.restore(win);
    this.wm.focus(win);
    this.sheet(win, {
      title: `Do you want to save the changes you made in the document “${doc.file.name}”?`,
      text: "Your changes will be lost if you don't save them.",
      icon: ICON.textedit,
      buttons: [
        { label: "Don't Save", left: true, run: () => (doc.revert(), proceed()) },
        { label: 'Cancel', cancel: true, run: cancelled },
        { label: 'Save', default: true, run: () => (doc.save(), proceed()) },
      ],
    });
  }

  /** Closing a Mail message with something typed in it. */
  private askDiscard(win: MacWindow, proceed: () => void) {
    this.wm.restore(win);
    this.wm.focus(win);
    this.sheet(win, {
      title: 'Do you want to save this message as a draft?',
      text: 'There is nowhere to keep drafts on this laptop, so closing it throws the message away.',
      icon: ICON.mail,
      buttons: [
        { label: 'Discard', left: true, run: proceed },
        { label: 'Cancel', default: true, cancel: true },
      ],
    });
  }

  // ---------- Appearance ----------

  private applyPrefs() {
    applyVolume();
    this.menubar.setMuted(prefs.muted || prefs.volume === 0);
    this.volumeSlider.value = String(prefs.muted ? 0 : prefs.volume);
    this.root.dataset.style = prefs.style;
    this.root.dataset.graphite = String(prefs.accent === 'graphite');
    this.dock.allowMagnify = prefs.dockMagnify;
    this.refreshChrome();
    void this.applyLook();
  }

  private lookSeq = 0;
  private async applyLook() {
    const seq = ++this.lookSeq;
    const look = await resolveLook();
    if (seq !== this.lookSeq) return;
    // Aqua was light only; dark mode is a Glass thing.
    this.root.dataset.scheme = look.dark && prefs.style !== 'aqua' ? 'dark' : 'light';
    this.root.dataset.menubar = look.menubarDark ? 'dark-text' : 'light-text';
    this.root.style.setProperty('--accent', look.accent);
    // Crossfade: the old picture stays underneath until the new one is decoded.
    const next = `url("${look.wallpaperUrl}")`;
    if (this.wall.style.backgroundImage !== next) {
      const old = this.wall.cloneNode() as HTMLElement;
      this.wall.after(old);
      this.wall.style.backgroundImage = next;
      old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease' }).onfinish = () => old.remove();
    }
  }

  private toggleVolume(anchor: HTMLElement) {
    this.spotlight.hide();
    const open = !this.volume.classList.contains('open');
    if (open) {
      const r = anchor.getBoundingClientRect();
      this.volume.style.left = `${r.left + r.width / 2 - 18}px`;
      play('menu-open', 0.6);
    }
    this.volume.classList.toggle('open', open);
  }

  /** The spinning beach ball, for a moment (an app the real Mac is opening). */
  private spin(ms: number) {
    this.spinUntil = Math.max(this.spinUntil, performance.now() + ms);
    if (this.spinTimer) return;
    let f = 0;
    this.root.classList.add('spinning');
    this.spinTimer = window.setInterval(() => {
      this.root.style.setProperty('--busy', CURSOR.beachball[f++ % CURSOR.beachball.length]);
      if (performance.now() > this.spinUntil) {
        clearInterval(this.spinTimer);
        this.spinTimer = 0;
        this.root.classList.remove('spinning');
      }
    }, 70);
  }

  private checkIdle() {
    if (!prefs.saverAfter || this.busy || this.saver.isOn || document.hidden) return;
    if (performance.now() - this.lastInput > prefs.saverAfter * 60_000) this.saver.start();
  }

  // ---------- Windows and apps ----------

  /** Every window opens through here, so Exposé and Dashboard step aside first. */
  private openWin(opts: WinOptions): MacWindow {
    this.expose.exit();
    this.dashboard.hide();
    return this.wm.open(opts);
  }

  /** Opens anything: a folder in Finder, a file in its app, an app (built-in or on the real computer). */
  private openNode(n: DesktopNode, origin?: DOMRect) {
    if (n.type === 'app') return this.launch(n, origin);
    if (n.type === 'file') return this.openFile(n, origin);
    const trail = trailTo(n) ?? [];
    this.openFinder({ kind: 'folder', trail: [...trail, n] }, origin);
  }

  private launch(app: DesktopApp, origin?: DOMRect) {
    noteRecent(app);
    if (app.url.startsWith('builtin:')) return this.openApp(app.url.slice(8), origin);
    // Must run inside the click or key press that triggered it, or the browser blocks it. Web pages get their own tab
    // so the portfolio stays open; other schemes (mailto:, slack://) go to the visitor's computer.
    if (/^https?:/.test(app.url)) window.open(app.url, '_blank', 'noopener');
    else window.location.href = app.url;
    this.dock.bounce(app.id);
    this.spin(LAUNCH_MS);
  }

  /** The laptop's own apps. Ones with a window come forward if they are already running. */
  private openApp(id: string, origin?: DOMRect) {
    const app = SYSTEM_APPS.find((a) => a.id === id);
    if (id === 'dashboard') return this.dashboard.toggle();
    if (id === 'prefs') return this.openPrefs();
    if (app && this.wm.windowsOf(app.name).length && id !== 'textedit' && id !== 'preview') return this.bringApp(app.name);
    if (id === 'mail') {
      const mail = new Mail(() => this.wm.close(win));
      const win = this.openWin({ app: 'Mail', title: 'New Message', width: 480, height: 400, minWidth: 340, minHeight: 300, key: 'mail', content: mail.el, icon: ICON.mail, unified: true, origin: origin ?? this.dock.rectOf('mail'), onCloseRequest: (close) => (mail.dirty ? this.askDiscard(win, close) : close()) });
      setTimeout(() => mail.focus(), 320);
    } else if (id === 'calculator') {
      const calc = new Calculator();
      const win = this.openWin({ app: 'Calculator', title: 'Calculator', width: 210, height: 286, fixed: true, metal: true, key: 'calculator', content: calc.el, icon: ICON.calculator, origin: origin ?? this.dock.rectOf('calculator'), onClose: () => this.keyed.delete(win) });
      this.keyed.set(win, calc);
    } else if (id === 'terminal') this.newTerminal(origin);
    else if (id === 'textedit' || id === 'preview') {
      // Opened on its own: pick something to open, the way the real app shows its Open panel.
      this.openFinder({ kind: 'desktop' }, origin);
    }
  }

  private newTerminal(origin?: DOMRect) {
    let win: MacWindow;
    const term = new Terminal({ open: (n) => this.openNode(n), exit: () => this.wm.close(win) });
    const n = this.wm.windowsOf('Terminal').length;
    win = this.openWin({ app: 'Terminal', title: `Terminal — bash — 80x24${n ? ` (${n + 1})` : ''}`, width: 560, height: 340, minWidth: 300, minHeight: 160, content: term.el, icon: ICON.terminal, origin: origin ?? this.dock.rectOf('terminal'), onClose: () => this.keyed.delete(win) });
    this.keyed.set(win, term);
    setTimeout(() => term.focus(), 320);
  }

  /** Dock click on a running app: unhide it and bring its windows forward (restoring one if all are minimised). */
  private bringApp(app: string) {
    this.wm.showApp(app);
    const wins = this.wm.windowsOf(app);
    const visible = wins.filter((w) => !w.minimized);
    if (!visible.length && wins.length) this.wm.restore(wins[wins.length - 1]);
    this.wm.bringAllToFront(app);
    const top = this.wm.active;
    if (top) this.keyed.get(top)?.focus?.();
  }

  private openFinder(loc: Loc = { kind: 'desktop' }, origin?: DOMRect) {
    let win: MacWindow;
    const view = new FinderView(
      {
        openFile: (f, o) => this.openFile(f, o),
        launch: (a, o) => this.launch(a, o),
        changed: (v) => {
          for (const [w, fv] of this.finders) if (fv === v) this.wm.setTitle(w, v.title(), v.icon());
          this.refreshChrome();
        },
        menu: (v, x, y, n) => this.menubar.popup(x, y, this.itemMenu(n, v)),
        denied: (name) => this.denied(name),
        emptyTrash: () => this.confirmEmptyTrash(),
      },
      loc,
    );
    win = this.openWin({
      app: 'Finder',
      title: view.title(),
      width: 680,
      height: 400,
      minWidth: 420,
      minHeight: 240,
      content: view.el,
      icon: view.icon(),
      origin,
      proxy: true,
      unified: true,
      metal: true,
      onToolbarToggle: () => view.toggleToolbar(),
      onClose: () => this.finders.delete(win),
    });
    this.finders.set(win, view);
    this.refreshChrome();
  }

  /** Dock click on Finder: raise a window if there is one, otherwise open one. */
  private focusFinder() {
    const wins = this.wm.windowsOf('Finder').filter((w) => this.finders.has(w));
    if (!wins.length) return this.openFinder({ kind: 'hd' }, this.dock.rectOf('finder'));
    this.bringApp('Finder');
  }

  private openPrefs(pane?: Pane) {
    if (this.prefsWin && this.wm.windows.includes(this.prefsWin)) {
      if (pane) this.prefsView?.show(pane);
      this.wm.restore(this.prefsWin);
      return this.wm.focus(this.prefsWin);
    }
    this.prefsView = new PrefsView({ testSaver: () => this.saver.start() }, pane);
    this.prefsWin = this.openWin({
      app: 'System Preferences',
      title: 'System Preferences',
      width: 560,
      height: 420,
      minWidth: 400,
      minHeight: 300,
      content: this.prefsView.el,
      icon: ICON.prefs,
      origin: this.dock.rectOf('prefs'),
      unified: true,
      onClose: () => {
        this.prefsView?.dispose();
        this.prefsWin = null;
        this.prefsView = null;
      },
    });
    this.refreshChrome();
  }

  private openFile(file: DesktopFile, origin?: DOMRect) {
    noteRecent(file);
    const key = `file:${pathOf(file)}`;
    if (file.icon === 'link') {
      if (file.url) window.open(file.url, '_blank', 'noopener');
      return;
    }
    if (file.icon === 'pdf' && file.src) {
      this.openWin({
        app: 'Preview',
        title: file.name,
        width: 560,
        height: 640,
        minWidth: 320,
        minHeight: 240,
        key,
        proxy: true,
        content: el('div', { class: 'doc doc-pdf' }, el('iframe', { src: import.meta.env.BASE_URL + file.src, title: file.name })),
        icon: nodeIcon(file),
        origin,
      });
      return;
    }
    if (file.icon === 'image') {
      const body = el('div', { class: 'doc-image' }, file.src ? el('img', { class: 'doc-photo', src: import.meta.env.BASE_URL + file.src, alt: file.name, draggable: 'false' }) : el('div', { class: 'doc-pic', html: PICTURE }), ...file.text.map((t) => el('p', { class: 'doc-cap', text: t })));
      this.openWin({ app: 'Preview', title: file.name, width: 460, height: 320, minWidth: 300, minHeight: 180, key, proxy: true, content: el('div', { class: 'doc preview' }, body), icon: ICON.image, origin });
      return;
    }
    const existing = this.wm.windows.find((w) => w.opts.key === key);
    if (existing) {
      this.wm.restore(existing);
      return this.wm.focus(existing);
    }
    let win: MacWindow;
    const doc = new TextDoc(file, (dirty) => this.wm.setDirty(win, dirty));
    win = this.openWin({
      app: 'TextEdit',
      title: file.name,
      width: 480,
      height: 340,
      minWidth: 300,
      minHeight: 180,
      key,
      proxy: true,
      content: doc.el,
      icon: ICON.doc,
      origin,
      onCloseRequest: (close) => (doc.dirty ? this.askSave(win, doc, close) : close()),
      onClose: () => {
        this.docs.delete(win);
        this.keyed.delete(win);
      },
    });
    this.docs.set(win, doc);
    this.keyed.set(win, doc);
    setTimeout(() => doc.focus(), 320);
  }

  private denied(name: string) {
    this.alert({ title: `The folder “${name}” could not be opened because you do not have sufficient access privileges.`, text: 'Some things are not for you to see.', buttons: [{ label: 'OK', default: true }] });
  }

  private getInfo(n: DesktopNode) {
    this.openWin({ app: 'Finder', title: `${n.name} Info`, width: 270, height: 440, fixed: true, key: `info:${pathOf(n)}`, content: getInfo(n), icon: nodeIcon(n) });
  }

  private profiler() {
    this.openWin({ app: 'System Profiler', title: USER.computer, width: 560, height: 360, minWidth: 380, minHeight: 220, key: 'profiler', content: systemProfiler(), icon: ICON.profiler, unified: true });
  }

  private help() {
    this.openWin({
      app: 'Help Viewer',
      title: 'Mac Help',
      width: 460,
      height: 420,
      minWidth: 300,
      minHeight: 200,
      key: 'help',
      icon: ICON.doc,
      content: el(
        'div',
        { class: 'doc help' },
        el('div', { class: 'help-body' }, el('h2', { text: 'Keyboard shortcuts' }), el('table', {}, ...SHORTCUTS.map(([k, v]) => el('tr', {}, el('td', { class: 'k', text: k }), el('td', { text: v }))))),
      ),
    });
  }

  /** ⌥⌘⎋: the Force Quit window, listing every running app. Finder can only be relaunched. */
  private forceQuit() {
    let pick = 'Finder';
    const list = el('div', { class: 'fq-list' });
    const action = el('button', { class: 'aq-btn default', type: 'button', text: 'Relaunch' });
    const render = () => {
      const apps = ['Finder', ...this.wm.apps.filter((a) => a !== 'Finder')];
      if (!apps.includes(pick)) pick = 'Finder';
      list.replaceChildren(
        ...apps.map((a) => {
          const r = el('button', { class: `fq-row${a === pick ? ' sel' : ''}`, type: 'button' }, el('span', { class: 'fq-ico', html: this.appIconFor(a) }), el('span', { text: a }));
          r.addEventListener('click', () => ((pick = a), render()));
          return r;
        }),
      );
      action.textContent = pick === 'Finder' ? 'Relaunch' : 'Force Quit';
    };
    action.addEventListener('click', () => {
      const app = pick;
      this.alert({
        title: app === 'Finder' ? 'Do you want to relaunch the Finder?' : `Do you want to force “${app}” to quit?`,
        text: 'You will lose any unsaved changes.',
        buttons: [
          { label: 'Cancel', cancel: true },
          {
            label: app === 'Finder' ? 'Relaunch' : 'Force Quit',
            default: true,
            run: () => {
              for (const w of this.wm.windowsOf(app)) if (w.opts.key !== 'forcequit') this.wm.close(w, true, true);
              if (app === 'Finder') this.relaunchFinder();
              render();
            },
          },
        ],
      });
    });
    render();
    const content = el(
      'div',
      { class: 'fq' },
      el('div', { class: 'fq-head', 'data-drag': '', text: "If an application doesn't respond for a while, select its name and click Force Quit." }),
      list,
      el('div', { class: 'fq-foot', 'data-drag': '' }, el('span', { class: 'fq-hint', text: 'You can open this window by pressing Command-Option-Escape.' }), action),
    );
    this.openWin({ app: 'Finder', title: 'Force Quit Applications', width: 360, height: 330, fixed: true, key: 'forcequit', content, icon: ICON.caution });
  }

  /** The desktop blinks away and comes back, like the Finder relaunching. */
  private relaunchFinder() {
    this.desktop.animate([{ opacity: 1 }, { opacity: 0, offset: 0.3 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 900 });
    this.spin(900);
  }

  private appIconFor(app: string) {
    if (app === 'Finder') return ICON.finder;
    if (app === 'Help Viewer') return ICON.doc;
    const sys = SYSTEM_APPS.find((a) => a.name === app);
    return sys ? appIcon(sys) : this.wm.windowsOf(app)[0]?.opts.icon ?? ICON.doc;
  }

  private moveToTrash(nodes: DesktopNode[]) {
    const ok = nodes.filter(canTrash);
    if (!ok.length) return play('alert');
    // Close what is open from there: a document that is in the Trash isn't open any more.
    for (const w of [...this.wm.windows]) if (ok.some((n) => w.opts.key === `file:${pathOf(n)}`)) this.wm.close(w, true);
    play('trash', 0.6);
    moveToTrash(ok);
  }

  private confirmEmptyTrash() {
    const n = trashItems().length;
    if (!n) return play('alert');
    this.alert({
      title: 'Are you sure you want to remove the items in the Trash permanently?',
      text: 'You cannot undo this action. (They come back when the page reloads: this is your life, not a real disk.)',
      icon: ICON.trashFull,
      buttons: [
        { label: 'Cancel', cancel: true },
        { label: 'OK', default: true, run: () => (play('trash'), emptyTrash()) },
      ],
    });
  }

  private about() {
    const row = (k: string, v: string) => el('div', { class: 'about-row' }, el('span', { class: 'k', text: k }), el('span', { text: v }));
    this.openWin({
      app: 'Finder',
      title: '',
      width: 280,
      height: 330,
      key: 'about',
      fixed: true,
      icon: ICON.laptop,
      content: el(
        'div',
        { class: 'about', 'data-drag': '' },
        el('div', { class: 'about-apple', html: GLYPH.apple }),
        el('div', { class: 'about-name', text: 'Mac OS X' }),
        el('div', { class: 'about-ver', text: 'Version 10.5 Determination' }),
        el('button', { class: 'aq-btn', type: 'button', text: 'Software Update…', onclick: () => this.softwareUpdate() }),
        el('div', { class: 'about-rows' }, row('Processor', '1.67 GHz PowerPC G4'), row('Memory', '1 GB DDR SDRAM'), row('Startup Disk', 'Macintosh HD')),
        el('button', { class: 'aq-btn', type: 'button', text: 'More Info…', onclick: () => this.profiler() }),
        el('div', { class: 'about-foot', text: 'Life Visualiser · LV-0001' }),
      ),
    });
  }

  private softwareUpdate() {
    this.spin(900);
    setTimeout(() => this.alert({ title: 'Your software is up to date.', text: 'There are no new updates for your computer at this time. You are exactly who you are.', icon: ICON.prefs, buttons: [{ label: 'Quit', default: true }] }), 900);
  }

  // ---------- Desktop ----------

  private renderDesktop() {
    const nodes = DESKTOP.filter((n) => n.type !== 'app' && isPresent(n));
    this.items = [
      { key: 'hd', name: 'Macintosh HD', icon: ICON.hd, node: null, open: (o) => this.openFinder({ kind: 'hd' }, o) },
      ...nodes.map((n) => ({ key: pathOf(n), name: n.name, icon: nodeIcon(n), node: n, open: (o: DOMRect) => this.openNode(n, o) })),
    ];
    this.deskEls = this.items.map((it, i) => {
      const d = el(
        'div',
        { class: 'mac-dicon' },
        el('div', { class: 'mac-dicon-art', html: it.icon }),
        el('div', { class: 'mac-dicon-name', text: it.name }),
      );
      d.addEventListener('pointerdown', (e) => this.iconDown(i, e));
      d.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.deskSel.has(i)) this.selectDesktop([i]);
        this.menubar.popup(e.clientX, e.clientY, this.itemMenu(it.node ?? null, null, it));
      });
      const spot = iconSpot(it.key);
      if (spot) {
        d.classList.add('placed');
        d.style.right = `${spot.r}px`;
        d.style.top = `${spot.t}px`;
      }
      return d;
    });
    this.desktop.replaceChildren(...this.deskEls);
    this.deskSel = new Set([...this.deskSel].filter((i) => i < this.deskEls.length));
    this.selectDesktop([...this.deskSel]);
  }

  /** Click selects, double-click opens, dragging moves the icon (and dropping it on the Trash trashes it). */
  private iconDown(i: number, e: PointerEvent) {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.ctrlKey) return;
    const d = this.deskEls[i];
    const sx = e.clientX, sy = e.clientY;
    let dragging = false;
    const box = this.desktop.getBoundingClientRect();
    const start = d.getBoundingClientRect();
    const trash = () => this.dock.rectOf('trash');
    const overTrash = (m: PointerEvent) => {
      const t = trash();
      return m.clientX >= t.left && m.clientX <= t.right && m.clientY >= t.top && m.clientY <= t.bottom;
    };
    const move = (m: PointerEvent) => {
      if (!dragging && Math.hypot(m.clientX - sx, m.clientY - sy) > DRAG_PX && e.pointerType === 'mouse') {
        dragging = true;
        d.classList.add('dragging', 'placed');
        this.selectDesktop([i]);
      }
      if (!dragging) return;
      d.style.right = `${box.right - (start.right + m.clientX - sx)}px`;
      d.style.top = `${start.top - box.top + m.clientY - sy}px`;
      this.dock.el.querySelector('[aria-label="Trash"]')?.classList.toggle('drop', overTrash(m));
    };
    const up = (m: PointerEvent) => {
      d.removeEventListener('pointermove', move);
      d.removeEventListener('pointerup', up);
      d.removeEventListener('pointercancel', up);
      this.dock.el.querySelector('[aria-label="Trash"]')?.classList.remove('drop');
      if (!dragging) return this.deskClick(i, m);
      d.classList.remove('dragging');
      const it = this.items[i];
      if (overTrash(m) && it.node && canTrash(it.node)) return this.moveToTrash([it.node]);
      if (overTrash(m)) {
        play('alert');
        return this.renderDesktop();
      }
      const r = d.getBoundingClientRect();
      setIconSpot(it.key, { r: Math.max(0, Math.round(box.right - r.right)), t: Math.max(0, Math.round(r.top - box.top)) });
    };
    d.setPointerCapture(e.pointerId);
    d.addEventListener('pointermove', move);
    d.addEventListener('pointerup', up);
    d.addEventListener('pointercancel', up);
  }

  private deskClick(i: number, e: PointerEvent) {
    if (this.deskLast.i === i && e.timeStamp - this.deskLast.t < DOUBLE_MS) {
      this.deskLast = { i: -1, t: 0 };
      this.openDeskItem(i);
      return;
    }
    this.deskLast = { i, t: e.timeStamp };
    if (e.shiftKey || e.metaKey) {
      const s = new Set(this.deskSel);
      s.has(i) ? s.delete(i) : s.add(i);
      return this.selectDesktop([...s]);
    }
    this.selectDesktop([i]);
  }

  private openDeskItem(i: number) {
    const art = this.deskEls[i]?.querySelector('.mac-dicon-art');
    this.items[i]?.open(art?.getBoundingClientRect() ?? new DOMRect());
  }

  private selectDesktop(ids: number[]) {
    this.deskSel = new Set(ids);
    this.deskEls.forEach((it, k) => it.classList.toggle('sel', this.deskSel.has(k)));
  }

  private get deskSelected(): DesktopNode[] {
    return [...this.deskSel].map((i) => this.items[i]?.node).filter((n): n is DesktopNode => !!n);
  }

  /** Rubber-band selection: drag on empty desktop to draw a box and select the icons it touches. */
  private startBand(e: PointerEvent) {
    if ((e.target as Element).closest('.mac-dicon')) return;
    this.selectDesktop([]);
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    this.desktop.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => {
      const x = Math.min(sx, m.clientX), y = Math.min(sy, m.clientY);
      const w = Math.abs(m.clientX - sx), h = Math.abs(m.clientY - sy);
      Object.assign(this.band.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, display: 'block' });
      const hit: number[] = [];
      this.deskEls.forEach((d, i) => {
        const r = d.querySelector('.mac-dicon-art')!.getBoundingClientRect();
        if (r.right > x && r.left < x + w && r.bottom > y && r.top < y + h) hit.push(i);
      });
      this.selectDesktop(hit);
    };
    const up = () => {
      this.band.style.display = 'none';
      this.desktop.removeEventListener('pointermove', move);
      this.desktop.removeEventListener('pointerup', up);
      this.desktop.removeEventListener('pointercancel', up);
    };
    this.desktop.addEventListener('pointermove', move);
    this.desktop.addEventListener('pointerup', up);
    this.desktop.addEventListener('pointercancel', up);
  }

  private desktopMenu(e: MouseEvent) {
    if ((e.target as Element).closest('.mac-dicon')) return;
    e.preventDefault();
    this.selectDesktop([]);
    this.menubar.popup(e.clientX, e.clientY, [
      { label: 'New Folder', disabled: true },
      'sep',
      { label: 'Get Info', run: () => this.getInfo(DESKTOP_NODE()) },
      'sep',
      { label: 'Change Desktop Background…', run: () => this.openPrefs('desktop') },
      { label: 'Clean Up', run: () => (clearIconSpots(), this.renderDesktop()) },
    ]);
  }

  /** The right-click menu for an item (in Finder `view`, or on the desktop), or for a Finder window's background. */
  private itemMenu(n: DesktopNode | null, view: FinderView | null, desk?: DeskItem): MenuEntry[] {
    if (view?.isTrash) {
      if (!n) return [{ label: 'Empty Trash', disabled: !trashItems().length, run: () => this.confirmEmptyTrash() }];
      return [{ label: 'Put Back', run: () => putBack([n]) }, 'sep', { label: 'Get Info', run: () => this.getInfo(n) }];
    }
    if (!n && desk) return [{ label: 'Open', run: () => desk.open(new DOMRect()) }, 'sep', { label: 'Get Info', disabled: true }];
    if (!n) return view ? view.backgroundMenu() : [];
    const locked = n.id.startsWith('__');
    return [
      { label: 'Open', run: () => (view ? view.openSelected() : this.openNode(n)) },
      'sep',
      { label: 'Move to Trash', disabled: !canTrash(n) || locked, run: () => this.moveToTrash(view ? [n] : this.deskSelected) },
      'sep',
      { label: 'Get Info', disabled: locked, run: () => this.getInfo(n) },
    ];
  }

  // ---------- Menus and dock ----------

  private activeFinder() {
    const w = this.wm.active;
    return w ? this.finders.get(w) : undefined;
  }

  /** What File > Open, Get Info and Move to Trash act on: the front Finder window's selection, else the desktop's. */
  private selection(): DesktopNode[] {
    const f = this.activeFinder();
    if (f) return f.selected ? [f.selected] : [];
    return this.wm.active ? [] : this.deskSelected;
  }

  private dockApp(a: DesktopApp): DockEntry {
    const name = a.name;
    const builtin = a.url.startsWith('builtin:');
    const running = builtin && this.wm.windowsOf(name).length > 0;
    return {
      id: a.id,
      label: name,
      icon: appIcon(a),
      running: running || (a.id === 'prefs' && !!this.prefsWin),
      onClick: () => (running ? this.bringApp(name) : this.launch(a, this.dock.rectOf(a.id))),
      onMenu: (x, y) => this.menubar.popup(x, y, this.dockMenu(name, running, a), true),
    };
  }

  /** A Dock tile's menu: its windows, then Show In Finder / Hide / Quit. */
  private dockMenu(app: string, running: boolean, node?: DesktopApp): MenuEntry[] {
    const wins: MenuEntry[] = this.wm.windowsOf(app).filter((w) => w.title).map((w) => ({ label: w.title, checked: w === this.wm.active, run: () => (this.wm.restore(w), this.wm.focus(w)) }));
    const items: MenuEntry[] = [...wins, ...(wins.length ? (['sep'] as MenuEntry[]) : [])];
    if (app === 'Finder') items.push({ label: 'New Finder Window', run: () => this.openFinder({ kind: 'hd' }) });
    if (app === 'Terminal') items.push({ label: 'New Window', run: () => this.newTerminal() });
    items.push({ label: 'Keep in Dock', checked: true, disabled: true });
    if (node) items.push({ label: 'Show In Finder', run: () => this.openFinder({ kind: 'apps' }) });
    if (running || app === 'Finder') {
      items.push('sep', { label: 'Hide', run: () => this.wm.hideApp(app) });
      if (app !== 'Finder') items.push({ label: 'Quit', run: () => this.wm.quit(app) });
    }
    return items;
  }

  private refreshChrome() {
    this.menubar.setMenus(this.menus(), extraMenus());
    const sys = (id: string) => SYSTEM_APPS.find((a) => a.id === id)!;
    const owner = DESKTOP.filter((n): n is DesktopApp => n.type === 'app');
    const kept = [...DOCK_BEFORE, ...DOCK_AFTER];
    const left: DockEntry[] = [
      { id: 'finder', label: 'Finder', icon: ICON.finder, running: true, onClick: () => this.focusFinder(), onMenu: (x, y) => this.menubar.popup(x, y, this.dockMenu('Finder', true), true) },
      ...DOCK_BEFORE.map((id) => this.dockApp(sys(id))),
      ...owner.map((a) => this.dockApp(a)),
      ...DOCK_AFTER.map((id) => this.dockApp(sys(id))),
      // Apps that aren't kept in the Dock show up while they run, like the real one.
      ...this.wm.apps
        .filter((app) => app !== 'Finder' && !kept.some((id) => sys(id).name === app))
        .map((app) => {
          const node = SYSTEM_APPS.find((a) => a.name === app);
          return {
            id: `app:${app}`,
            label: app,
            icon: this.appIconFor(app),
            running: true,
            onClick: () => this.bringApp(app),
            onMenu: (x: number, y: number) => this.menubar.popup(x, y, this.dockMenu(app, true, node).filter((m) => m === 'sep' || m.label !== 'Keep in Dock'), true),
          };
        }),
    ];
    const minimized = this.wm.windows.filter((w) => w.minimized);
    const size = dockIconSize(left.length + minimized.length + 1);
    const right: DockEntry[] = [
      ...minimized
        .map((w) => ({ id: `min:${w.id}`, label: w.title || w.app, icon: w.opts.icon, node: this.wm.thumbnail(w, size), onClick: () => this.wm.restore(w) })),
      {
        id: 'trash',
        label: 'Trash',
        icon: trashItems().length ? ICON.trashFull : ICON.trash,
        onClick: () => this.openFinder({ kind: 'trash' }, this.dock.rectOf('trash')),
        onMenu: (x, y) => this.menubar.popup(x, y, [{ label: 'Open', run: () => this.openFinder({ kind: 'trash' }) }, 'sep', { label: 'Empty Trash', disabled: !trashItems().length, run: () => this.confirmEmptyTrash() }], true),
      },
    ];
    this.dock.setEntries(left, right);
  }

  private menus(): Menu[] {
    const win = this.wm.active;
    const finder = this.activeFinder();
    const doc = win ? this.docs.get(win) : undefined;
    const app = win?.app ?? 'Finder';
    const off = (label: string, shortcut?: string): MenuItem => ({ label, shortcut, disabled: true });
    const sel = this.selection();
    const one = sel.length === 1 ? sel[0] : undefined;
    const focused = document.activeElement;
    const editable = !!focused && this.root.contains(focused) && !!focused.closest('textarea, input[type=text], input[type=search], input[type=password], [contenteditable]');

    const recent = recentItems();
    const recentApps = recent.filter((n) => n.type === 'app');
    const recentDocs = recent.filter((n) => n.type !== 'app');
    const recentMenu: MenuEntry[] = [
      off('Applications'),
      ...recentApps.map((n) => ({ label: n.name, icon: nodeIcon(n), run: () => this.openNode(n) })),
      'sep',
      off('Documents'),
      ...recentDocs.map((n) => ({ label: n.name, icon: nodeIcon(n), run: () => this.openNode(n) })),
      'sep',
      { label: 'Clear Menu', disabled: !recent.length, run: () => clearRecent() },
    ];

    const apple: Menu = {
      title: 'Apple',
      apple: true,
      items: [
        { label: 'About This Mac', run: () => this.about() },
        { label: 'Software Update…', run: () => this.softwareUpdate() },
        'sep',
        { label: 'System Preferences…', run: () => this.openPrefs() },
        {
          label: 'Dock',
          submenu: [
            { label: prefs.dockMagnify ? 'Turn Magnification Off' : 'Turn Magnification On', run: () => setPrefs({ dockMagnify: !prefs.dockMagnify }) },
            'sep',
            { label: 'Dock Preferences…', run: () => this.openPrefs('dock') },
          ],
        },
        'sep',
        { label: 'Recent Items', submenu: recentMenu },
        'sep',
        { label: 'Force Quit…', shortcut: '⌥⌘⎋', run: () => this.forceQuit() },
        'sep',
        { label: 'Sleep', run: () => void this.powerDown('sleep') },
        { label: 'Restart…', run: () => this.confirmPower('restart') },
        { label: 'Shut Down…', run: () => this.confirmPower('shutdown') },
        'sep',
        { label: `Log Out ${USER.name}…`, shortcut: '⇧⌘Q', run: () => this.confirmPower('logout') },
      ],
    };

    const hideItems: MenuEntry[] = [
      { label: `Hide ${app}`, shortcut: '⌘H', run: () => this.wm.hideApp(app) },
      { label: 'Hide Others', shortcut: '⌥⌘H', disabled: this.wm.apps.length < 2, run: () => this.wm.apps.filter((a) => a !== app).forEach((a) => this.wm.hideApp(a)) },
      { label: 'Show All', disabled: !this.wm.windows.some((w) => w.hidden), run: () => this.wm.showAll() },
    ];
    const appMenu: Menu =
      app === 'Finder'
        ? {
            title: 'Finder',
            bold: true,
            items: [{ label: 'About Finder', run: () => this.about() }, 'sep', { label: 'Preferences…', shortcut: '⌘,', run: () => this.openPrefs() }, 'sep', { label: 'Empty Trash…', shortcut: '⇧⌘⌫', disabled: !trashItems().length, run: () => this.confirmEmptyTrash() }, 'sep', off('Services'), 'sep', ...hideItems],
          }
        : {
            title: app,
            bold: true,
            items: [
              { label: `About ${app}`, run: () => this.about() },
              'sep',
              app === 'System Preferences' ? off('Preferences…', '⌘,') : { label: 'Preferences…', shortcut: '⌘,', run: () => this.openPrefs() },
              'sep',
              ...hideItems,
              'sep',
              { label: `Quit ${app}`, shortcut: '⌘Q', run: () => this.wm.quit(app) },
            ],
          };

    const close: MenuItem = { label: 'Close Window', shortcut: '⌘W', disabled: !win, run: () => win && this.wm.close(win) };
    const file: Menu =
      app === 'TextEdit'
        ? {
            title: 'File',
            items: [
              off('New', '⌘N'),
              { label: 'Open…', shortcut: '⌘O', run: () => this.openFinder({ kind: 'desktop' }) },
              { label: 'Open Recent', submenu: recentDocs.length ? recentDocs.map((n) => ({ label: n.name, run: () => this.openNode(n) })) : [off('No recent documents')] },
              'sep',
              { ...close, label: 'Close' },
              { label: 'Save', shortcut: '⌘S', disabled: !doc, run: () => doc?.save() },
              { label: 'Revert to Saved', disabled: !doc?.dirty, run: () => doc?.revert() },
              'sep',
              off('Print…', '⌘P'),
            ],
          }
        : app === 'Terminal'
          ? { title: 'File', items: [{ label: 'New Window', shortcut: '⌘N', run: () => this.newTerminal() }, 'sep', close] }
          : {
              title: 'File',
              items: [
                { label: 'New Finder Window', shortcut: '⌘N', run: () => this.openFinder({ kind: 'hd' }) },
                off('New Folder', '⇧⌘N'),
                'sep',
                { label: 'Open', shortcut: '⌘O', disabled: !sel.length, run: () => (finder ? finder.openSelected() : [...this.deskSel].forEach((i) => this.openDeskItem(i))) },
                { label: 'Open Selection', shortcut: '⌘↓', disabled: !sel.length, run: () => (finder ? finder.openSelected() : [...this.deskSel].forEach((i) => this.openDeskItem(i))) },
                close,
                'sep',
                { label: 'Get Info', shortcut: '⌘I', disabled: !one || one.id.startsWith('__'), run: () => one && this.getInfo(one) },
                'sep',
                finder?.isTrash
                  ? { label: 'Put Back', disabled: !one, run: () => one && putBack([one]) }
                  : { label: 'Move to Trash', shortcut: '⌘⌫', disabled: !sel.some(canTrash), run: () => this.moveToTrash(sel) },
                'sep',
                { label: 'Find…', shortcut: '⌘F', run: () => this.spotlight.toggle(this.menubar.el.querySelector('[aria-label="Spotlight"]')!) },
              ],
            };

    const exec = (cmd: string) => () => {
      if (cmd === 'paste') return void navigator.clipboard?.readText().then((t) => document.execCommand('insertText', false, t)).catch(() => play('alert'));
      document.execCommand(cmd);
    };
    const edit: Menu = {
      title: 'Edit',
      optional: true,
      items: [
        { label: 'Undo', shortcut: '⌘Z', disabled: !editable, run: exec('undo') },
        { label: 'Redo', shortcut: '⇧⌘Z', disabled: !editable, run: exec('redo') },
        'sep',
        { label: 'Cut', shortcut: '⌘X', disabled: !editable, run: exec('cut') },
        { label: 'Copy', shortcut: '⌘C', disabled: !editable, run: exec('copy') },
        { label: 'Paste', shortcut: '⌘V', disabled: !editable, run: exec('paste') },
        'sep',
        { label: 'Select All', shortcut: '⌘A', disabled: !editable && !!finder, run: () => (editable ? exec('selectAll')() : this.selectDesktop(this.items.map((_, i) => i))) },
        'sep',
        { label: 'Special Characters…', disabled: true },
      ],
    };

    const view: Menu =
      app === 'TextEdit'
        ? { title: 'Format', optional: true, items: [{ label: doc?.rulerShown ? 'Hide Ruler' : 'Show Ruler', shortcut: '⌘R', disabled: !doc, run: () => doc?.toggleRuler() }, 'sep', off('Make Rich Text', '⇧⌘T')] }
        : {
            title: 'View',
            optional: true,
            items: [
              { label: 'as Icons', shortcut: '⌘1', checked: finder?.view === 'grid', disabled: !finder, run: () => finder?.setView('grid') },
              { label: 'as List', shortcut: '⌘2', checked: finder?.view === 'list', disabled: !finder, run: () => finder?.setView('list') },
              { label: 'as Columns', shortcut: '⌘3', checked: finder?.view === 'columns', disabled: !finder, run: () => finder?.setView('columns') },
              'sep',
              { label: finder && !finder.toolbarShown ? 'Show Toolbar' : 'Hide Toolbar', shortcut: '⌥⌘T', disabled: !finder, run: () => finder?.toggleToolbar() },
              'sep',
              { label: 'Clean Up', disabled: !!finder, run: () => (clearIconSpots(), this.renderDesktop()) },
            ],
          };

    const goTo = (loc: Loc) => (finder ? finder.go(loc) : this.openFinder(loc));
    const go: Menu = {
      title: 'Go',
      optional: true,
      items: [
        { label: 'Back', shortcut: '⌘[', disabled: !finder?.canBack, run: () => finder?.back() },
        { label: 'Forward', shortcut: '⌘]', disabled: !finder?.canForward, run: () => finder?.forward() },
        { label: 'Enclosing Folder', shortcut: '⌘↑', disabled: !finder?.canUp, run: () => finder?.up() },
        'sep',
        { label: 'Computer', shortcut: '⇧⌘C', run: () => goTo({ kind: 'hd' }) },
        { label: 'Desktop', shortcut: '⇧⌘D', run: () => goTo({ kind: 'desktop' }) },
        { label: 'Applications', shortcut: '⇧⌘A', run: () => goTo({ kind: 'apps' }) },
      ],
    };

    const exposeMenu: MenuEntry[] = [
      { label: 'All Windows', shortcut: 'F9', run: () => this.expose.toggle('all') },
      { label: 'Application Windows', shortcut: 'F10', run: () => this.expose.toggle('app') },
      { label: 'Desktop', shortcut: 'F11', run: () => this.expose.toggle('desktop') },
      'sep',
      { label: 'Dashboard', shortcut: 'F12', run: () => this.dashboard.toggle() },
    ];
    const windowMenu: Menu = {
      title: 'Window',
      items: [
        { label: 'Minimize', shortcut: '⌘M', disabled: !win || win.opts.fixed, run: () => win && this.wm.minimize(win) },
        { label: 'Zoom', disabled: !win || win.opts.fixed, run: () => win && this.wm.toggleZoom(win) },
        { label: 'Cycle Through Windows', shortcut: '⌘`', disabled: this.wm.windowsOf(app).length < 2, run: () => this.wm.cycle() },
        'sep',
        { label: 'Bring All to Front', disabled: !win, run: () => this.wm.bringAllToFront(app) },
        { label: 'Exposé', submenu: exposeMenu },
        ...(this.wm.windows.length
          ? (['sep', ...this.wm.windows.filter((w) => w.title).map((w) => ({ label: `${w.minimized ? '◆ ' : ''}${w.title}`, checked: w === win, run: () => (this.wm.restore(w), this.wm.focus(w)) }))] as MenuEntry[])
          : []),
      ],
    };

    const help: Menu = { title: 'Help', optional: true, items: [{ label: 'Mac Help', shortcut: '⌘?', run: () => this.help() }, { label: 'Keyboard Shortcuts', run: () => this.help() }] };
    return app === 'Finder' ? [apple, appMenu, file, edit, view, go, windowMenu, help] : [apple, appMenu, file, edit, view, windowMenu, help];
  }

  // ---------- Keyboard ----------

  private onKey = (e: KeyboardEvent) => {
    this.lastInput = performance.now();
    const typing = (e.target as Element | null)?.closest?.('input:not([type=range]):not([type=checkbox]), textarea, select, [contenteditable]');
    const cmd = e.metaKey || e.ctrlKey;

    // Force Quit first: it has Esc in it, and it is for when things are stuck.
    if (cmd && e.altKey && e.key === 'Escape') {
      e.preventDefault();
      return this.forceQuit();
    }
    if (this.asleep) {
      e.preventDefault();
      return this.wake();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.modal) this.modal.cancel();
      else if (this.expose.mode) this.expose.exit();
      else if (this.dashboard.hide() || this.spotlight.hide() || this.menubar.closeMenus()) return;
      else if (this.volume.classList.contains('open')) this.volume.classList.remove('open');
      return;
    }
    if (this.menubar.key(e)) return;
    const k = e.key.toLowerCase();
    if (this.busy) return e.preventDefault();
    // At the login window only its own fields take keys.
    if (this.screens.loggedOut && !typing) return;
    if (this.modal && e.key === 'Enter') {
      e.preventDefault();
      return this.modal.ok();
    }
    // Text fields keep their own editing keys; everything else with ⌘ (or an F-key) is a menu shortcut.
    if (typing && cmd && !e.shiftKey && 'zxcva'.includes(k)) return;
    if ((cmd || /^F\d+$/.test(e.key)) && this.menubar.trigger(e)) return;
    if (typing) return;

    const win = this.wm.active;
    if (win && this.keyed.get(win)?.onKey?.(e)) return e.preventDefault();
    if (cmd || e.altKey) return;

    const finder = this.activeFinder();
    const dir = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[e.key as 'ArrowUp'];
    if (dir) {
      e.preventDefault();
      if (finder) finder.move(dir);
      else if (!win) this.moveDesktopSelection(dir);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (finder) finder.openSelected();
      else if (!win) for (const i of this.deskSel) this.openDeskItem(i);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      finder?.up();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      if (finder) finder.typeSelect(e.key);
      else if (!win) this.typeSelectDesktop(e.key);
    }
  };

  private typeSelectDesktop(ch: string) {
    const now = performance.now();
    this.typed = { text: (now - this.typed.t < 900 ? this.typed.text : '') + ch.toLowerCase(), t: now };
    const i = this.items.findIndex((it) => it.name.toLowerCase().startsWith(this.typed.text));
    if (i >= 0) this.selectDesktop([i]);
  }

  private moveDesktopSelection(dir: 'up' | 'down' | 'left' | 'right') {
    const n = this.deskEls.length;
    if (!n) return;
    const cur = this.deskSel.size ? Math.min(...this.deskSel) : -1;
    if (cur < 0) return this.selectDesktop([0]);
    // Columns run right to left, so "left" is the next column over.
    const left = this.deskEls[0].offsetLeft;
    const perCol = Math.max(1, this.deskEls.filter((it) => it.offsetLeft === left).length);
    const d = { up: -1, down: 1, left: perCol, right: -perCol }[dir];
    this.selectDesktop([Math.min(n - 1, Math.max(0, cur + d))]);
  }
}

/** The Desktop as a folder, for Get Info on the desktop background. */
const DESKTOP_NODE = (): DesktopFolder => ({ type: 'folder', id: 'desktop', name: 'Desktop', children: DESKTOP.filter((n) => n.type !== 'app') });

let instance: MacScreen | null = null;
/** The one laptop screen, created on first use. */
export const macScreen = () => (instance ??= new MacScreen());

/** Placeholder for image files: a little landscape, drawn in code like everything else. */
const PICTURE = `<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="150" fill="#8fd0ff"/><circle cx="190" cy="36" r="16" fill="#ffd54a"/><path d="M0 110l50-44 44 36 40-30 106 52v26H0z" fill="#5aa86a"/><path d="M0 128l60-20 70 16 110-20v46H0z" fill="#3f8a52"/></svg>`;

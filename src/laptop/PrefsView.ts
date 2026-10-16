import { BUILTIN_WALLPAPERS, wallpaperThumb } from './appearance';
import { assets } from './assets';
import { el } from './dom';
import { GLYPH, ICON } from './icons';
import { ACCENTS, onPrefs, prefs, setPrefs, type Prefs as P } from './prefs';
import { Flurry } from './ScreenSaver';
import { hasFile, isLoop, play, preloadSounds, SOUND_NAMES, type SoundName } from './sound';

export type Pane = 'appearance' | 'desktop' | 'saver' | 'dock' | 'datetime' | 'sound';

const PANES: { id: Pane; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: ICON.prefs },
  { id: 'desktop', label: 'Desktop', icon: ICON.desktopFolder },
  { id: 'saver', label: 'Screen Saver', icon: `<span class="pref-saver"></span>` },
  { id: 'dock', label: 'Dock', icon: `<span class="pref-dockico"><i></i><i></i><i></i></span>` },
  { id: 'datetime', label: 'Date & Time', icon: ICON.dashboard },
  { id: 'sound', label: 'Sound', icon: `<span class="pref-speaker">${GLYPH.speaker}</span>` },
];

export interface PrefsHost {
  /** Screen Saver > Test. */
  testSaver(): void;
}

/** What each sound is for, shown in the Sound pane so the owner knows which file goes where. */
const SOUND_LABEL: Record<SoundName, string> = {
  boot: 'Startup chime',
  'window-open': 'Window opens',
  'window-close': 'Window closes',
  'window-collapse': 'Minimize (into the Dock)',
  'window-expand': 'Restore (out of the Dock)',
  'window-zoom-max': 'Zoom in',
  'window-zoom-min': 'Zoom out',
  'window-move': 'Dragging a window (loop)',
  'window-move-stop': 'Window let go',
  'window-resize': 'Resizing a window (loop)',
  'menu-open': 'Menu opens',
  'menu-close': 'Menu closes',
  'menu-hover': 'Pointer over a menu item',
  'menu-click': 'Menu item chosen',
  'button-down': 'Button pressed',
  'button-up': 'Button released',
  click: 'Click',
  alert: 'Alert',
  volume: 'Volume changed',
  trash: 'Empty Trash',
  expose: 'Exposé',
  dashboard: 'Dashboard',
  'mail-sent': 'Mail sent',
};

/** System Preferences: Appearance (light/dark, accent), Desktop (wallpaper) and Sound. Everything saves as you go. */
export class PrefsView {
  readonly el: HTMLElement;
  private body: HTMLElement;
  private tabs: HTMLElement;
  private pane: Pane;
  private flurry = new Flurry();
  private unwatch: () => void;

  constructor(private host: PrefsHost, start: Pane = 'appearance') {
    this.pane = start;
    this.tabs = el('div', { class: 'pref-tabs', 'data-drag': '' });
    this.body = el('div', { class: 'pref-body' });
    this.el = el('div', { class: 'pref' }, this.tabs, this.body);
    this.unwatch = onPrefs(() => this.render());
    this.render();
  }

  show(pane: Pane) {
    this.pane = pane;
    this.render();
  }

  /** Stops the screen saver preview when the window closes. */
  dispose() {
    this.flurry.stop();
    this.unwatch();
  }

  private render() {
    this.flurry.stop();
    this.tabs.replaceChildren(
      ...PANES.map((p) => {
        const b = el('button', { class: `pref-tab${p.id === this.pane ? ' on' : ''}`, type: 'button' }, el('span', { class: 'pref-tab-ico', html: p.icon }), el('span', { text: p.label }));
        b.addEventListener('click', () => {
          play('click', 0.6);
          this.show(p.id);
        });
        return b;
      }),
    );
    if (this.pane === 'appearance') this.appearance();
    else if (this.pane === 'desktop') void this.desktop();
    else if (this.pane === 'saver') this.saver();
    else if (this.pane === 'dock') this.dock();
    else if (this.pane === 'datetime') this.dateTime();
    else void this.sound();
  }

  private popup<T extends string | number>(label: string, value: T, options: [T, string][], set: (v: T) => void) {
    const sel = el('select', { class: 'aq-popup', 'aria-label': label }, ...options.map(([v, t]) => el('option', { value: String(v), text: t, selected: v === value ? '' : null })));
    sel.addEventListener('change', () => {
      const v = options.find(([o]) => String(o) === sel.value)?.[0];
      if (v !== undefined) set(v);
    });
    return sel;
  }

  private saver() {
    const canvas = el('canvas', { class: 'pref-saver-preview' });
    const test = el('button', { class: 'aq-btn', type: 'button', text: 'Test' });
    test.addEventListener('click', () => this.host.testSaver());
    this.body.replaceChildren(
      el('div', { class: 'pref-saver-box' }, el('div', { class: 'pref-saver-list' }, el('div', { class: 'pref-saver-head', text: 'Screen Savers' }), el('div', { class: 'pref-saver-item on', text: 'Flurry' })), el('div', { class: 'pref-saver-right' }, canvas, test)),
      row(
        'Start screen saver',
        'When the laptop is open and you leave it alone',
        this.popup('Start screen saver', prefs.saverAfter, [[1, 'After 1 minute'], [2, 'After 2 minutes'], [5, 'After 5 minutes'], [15, 'After 15 minutes'], [0, 'Never']], (v) => setPrefs({ saverAfter: v })),
      ),
    );
    requestAnimationFrame(() => this.pane === 'saver' && canvas.isConnected && this.flurry.start(canvas));
  }

  private dock() {
    this.body.replaceChildren(
      row('', '', check('Magnification', prefs.dockMagnify, (on) => setPrefs({ dockMagnify: on }))),
      el('p', { class: 'pref-note', text: 'Right-click (or press and hold) a Dock icon for its menu. Magnification needs a mouse.' }),
    );
  }

  private dateTime() {
    const d = new Date();
    this.body.replaceChildren(
      row('Date', '', el('div', { class: 'pref-static', text: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) })),
      row('Time zone', '', el('div', { class: 'pref-static', text: Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ') })),
      row('', '', check('Set date & time automatically', true, () => {})),
      row('Menu bar clock', '', this.popup('Menu bar clock', prefs.analogClock ? 'analog' : 'digital', [['digital', 'Digital'], ['analog', 'Analog']], (v) => setPrefs({ analogClock: v === 'analog' }))),
      el('p', { class: 'pref-note', text: 'The time is your computer\'s own. Some things even a portfolio cannot change.' }),
    );
  }

  private appearance() {
    const select = el(
      'select',
      { class: 'aq-popup', 'aria-label': 'Appearance' },
      ...(['system', 'light', 'dark'] as const).map((v) => el('option', { value: v, text: v === 'system' ? 'Match System' : v[0].toUpperCase() + v.slice(1), selected: prefs.scheme === v ? '' : null })),
    );
    select.addEventListener('change', () => setPrefs({ scheme: select.value as P['scheme'] }));

    const swatch = (id: string, color: string, label: string) => {
      const b = el('button', { class: `aq-swatch${prefs.accent === id ? ' on' : ''}`, type: 'button', title: label, 'aria-label': label, style: `--sw:${color}` });
      b.addEventListener('click', () => {
        play('click', 0.6);
        setPrefs({ accent: id });
      });
      return b;
    };
    const style = this.popup('Style', prefs.style, [['glass', 'Glass (Leopard)'], ['aqua', 'Aqua (Jaguar & Tiger)']], (v) => setPrefs({ style: v }));
    this.body.replaceChildren(
      row('Style', 'Glass: see-through, like Leopard. Aqua: pinstripes and brushed metal', style),
      row('Appearance', prefs.style === 'aqua' ? 'Aqua was always light; dark applies to Glass' : 'Light, dark, or follow the computer this runs on', select),
      row(
        'Accent Color',
        'Tints selections, menus, buttons and window controls',
        el(
          'div',
          { class: 'aq-swatches' },
          swatch('wallpaper', 'conic-gradient(#e0569f, #ef8a26, #e2b628, #5aa83a, #2ea2a8, #3b7fe0, #9a5bd1, #e0569f)', 'From wallpaper'),
          ...Object.entries(ACCENTS).map(([id, c]) => swatch(id, c, id[0].toUpperCase() + id.slice(1))),
        ),
      ),
      el('p', { class: 'pref-note', text: prefs.accent === 'wallpaper' ? 'Accent: picked from your desktop picture.' : `Accent: ${prefs.accent}.` }),
    );
  }

  private async desktop() {
    const list: { id: string; name: string; thumb?: string }[] = [...BUILTIN_WALLPAPERS.map((w) => ({ id: `builtin:${w.id}`, name: w.name })), ...(await assets()).wallpapers.map((w) => ({ id: w.file, name: w.name, thumb: w.thumb }))];
    if (this.pane !== 'desktop') return;
    this.body.replaceChildren(
      el(
        'div',
        { class: 'pref-walls' },
        ...list.map((w) => {
          const b = el('button', { class: `pref-wall${prefs.wallpaper === w.id ? ' on' : ''}`, type: 'button' }, el('img', { src: wallpaperThumb(w.id, w.thumb), alt: '', draggable: 'false' }), el('span', { text: w.name }));
          b.addEventListener('click', () => {
            play('click', 0.6);
            setPrefs({ wallpaper: w.id });
          });
          return b;
        }),
      ),
      el('p', { class: 'pref-note', text: 'Add your own pictures in public/laptop/ and list them in assets.json.' }),
    );
  }

  private async sound() {
    await preloadSounds();
    if (this.pane !== 'sound') return;
    const slider = el('input', { class: 'aq-slider', type: 'range', min: '0', max: '1', step: '0.05', value: String(prefs.volume), 'aria-label': 'Output volume' });
    slider.addEventListener('input', () => setPrefs({ volume: Number(slider.value), muted: false }));
    slider.addEventListener('change', () => play('volume'));
    this.body.replaceChildren(
      row('Output volume', '', el('div', { class: 'pref-vol' }, el('span', { class: 'pref-vol-ico', html: GLYPH.speakerOff }), slider, el('span', { class: 'pref-vol-ico', html: GLYPH.speaker }))),
      row('', '', check('Mute', prefs.muted, (on) => setPrefs({ muted: on }))),
      row('', '', check('Play user interface sound effects', prefs.uiSounds, (on) => setPrefs({ uiSounds: on }))),
      el(
        'div',
        { class: 'pref-sounds' },
        ...SOUND_NAMES.map((n) => {
          const b = el('button', { class: 'aq-btn small', type: 'button', text: '▶', 'aria-label': `Play ${n}` });
          b.addEventListener('click', () => play(n));
          const src = hasFile(n) ? 'Your file' : isLoop(n) ? 'No file (silent)' : 'Built-in';
          return el('div', { class: 'pref-sound' }, b, el('span', { class: 'pref-sound-name', text: SOUND_LABEL[n] }), el('span', { class: `pref-sound-src${hasFile(n) ? ' file' : ''}`, text: src }));
        }),
      ),
    );
  }
}

function row(label: string, hint: string, control: HTMLElement) {
  return el('div', { class: 'pref-row' }, el('div', { class: 'pref-label' }, el('div', { text: label }), hint ? el('small', { text: hint }) : null), el('div', { class: 'pref-control' }, control));
}

function check(label: string, on: boolean, set: (on: boolean) => void) {
  const box = el('input', { type: 'checkbox', class: 'aq-check', checked: on ? '' : null });
  box.addEventListener('change', () => {
    play('click', 0.6);
    set(box.checked);
  });
  return el('label', { class: 'aq-check-label' }, box, el('span', { text: label }));
}

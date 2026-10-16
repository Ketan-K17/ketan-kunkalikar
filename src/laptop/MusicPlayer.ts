import { MUSIC } from './desktop';
import { el } from './dom';
import { play } from './sound';

/**
 * The music widget: a little click-wheel music player pinned to the top right of the desktop, always there.
 * It drives Spotify's embed through the iFrame API, with no backend.
 *
 * That API can start, pause and seek the embed and report its position, but it can't list tracks or skip. So "next"
 * seeks to the end of the current track (the embed moves on by itself), and the title and cover come from Spotify's
 * public oEmbed endpoint. The embed itself is hidden behind the player's face. It only slides out from under it if a
 * press of play gets no response (some browsers want one click inside it), or when chosen from the player's menu.
 *
 * The wheel works like the real one: press MENU / ⏮ / ⏭ / ▶❙❙ or the centre, or drag around the ring to scrub
 * (or to move through the menu). Drag the body to move it; where it was left is remembered in localStorage. Shut Down pauses it.
 */

interface PlaybackUpdate {
  isPaused: boolean;
  isBuffering: boolean;
  /** Milliseconds. */
  duration: number;
  position: number;
  playingURI?: string;
}

interface Controller {
  togglePlay(): void;
  pause(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: string, cb: (e: { data: unknown }) => void): void;
}

interface IFrameApi {
  createController(host: HTMLElement, options: { uri: string; width: string; height: number }, cb: (c: Controller) => void): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void;
    SpotifyIframeConfig?: unknown;
  }
}

const EMBED_H = 152;
/** If a press of play produces no update within this long, show the embed so the player can click inside it. */
const STUCK_MS = 2500;
/** Scrubbing: seconds moved per full turn of the wheel, and degrees per click of the wheel. */
const SCRUB_PER_TURN = 60;
const NOTCH_DEG = 24;

let apiPromise: Promise<IFrameApi> | null = null;
/** Loads Spotify's script once. Rejects after a while (offline, content blocker) and lets a later call try again. */
function loadApi(): Promise<IFrameApi> {
  apiPromise ??= new Promise<IFrameApi>((resolve, reject) => {
    const fail = () => {
      apiPromise = null;
      window.onSpotifyIframeApiReady = undefined;
      // Spotify's loader refuses to run twice, so wipe its marker to allow a retry.
      delete window.SpotifyIframeConfig;
      document.getElementById('spotify-iframeapi-script')?.remove();
      reject(new Error('Spotify did not load'));
    };
    const timer = window.setTimeout(fail, 10000);
    window.onSpotifyIframeApiReady = (api) => {
      window.clearTimeout(timer);
      resolve(api);
    };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    document.head.append(s);
  });
  return apiPromise;
}

interface Meta {
  title: string;
  thumb: string;
}
const metaCache = new Map<string, Promise<Meta | null>>();
/** Title and cover of a track, album or playlist, from Spotify's public oEmbed endpoint (CORS-enabled, no key). */
function describe(uri: string): Promise<Meta | null> {
  let p = metaCache.get(uri);
  if (!p) {
    p = fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { title?: string; thumbnail_url?: string } | null) => (j?.title ? { title: j.title, thumb: j.thumbnail_url ?? '' } : null))
      .catch(() => null);
    metaCache.set(uri, p);
  }
  return p;
}

/** `spotify:playlist:abc` → `https://open.spotify.com/playlist/abc`. */
const webUrl = (uri: string) => `https://open.spotify.com/${uri.split(':').slice(1).join('/')}`;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const NOTE = `<svg viewBox="0 0 64 64"><path d="M41 15v22.5a6.5 6.5 0 1 1-3.4-5.7V24.5l-13 3.2V42a6.5 6.5 0 1 1-3.4-5.7V22z" fill="currentColor"/></svg>`;
const PREV = `<svg viewBox="0 0 20 12"><path d="M2 1h2v10H2zM11 1L4.5 6 11 11zM18 1l-6.5 5L18 11z"/></svg>`;
const NEXT = `<svg viewBox="0 0 20 12"><path d="M16 1h2v10h-2zM9 1l6.5 5L9 11zM2 1l6.5 5L2 11z"/></svg>`;
const PLAYPAUSE = `<svg viewBox="0 0 22 12"><path d="M1 1l8 5-8 5zM13 1h2.6v10H13zM18.4 1H21v10h-2.6z"/></svg>`;
const PLAYING = `<svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>`;
const PAUSED = `<svg viewBox="0 0 12 12"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>`;

const SPOT_KEY = 'lv-music-widget';
function loadSpot(): { x: number; y: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(SPOT_KEY) ?? 'null');
    return typeof v?.x === 'number' && typeof v?.y === 'number' ? v : null;
  } catch {
    return null;
  }
}
function saveSpot(spot: { x: number; y: number }) {
  try {
    localStorage.setItem(SPOT_KEY, JSON.stringify(spot));
  } catch {
    /* private window: it just won't be remembered */
  }
}

type MenuItem = { label: string; run: () => void };

export class MusicPlayer {
  readonly el: HTMLElement;

  private ctl: Controller | null = null;
  private started = false;
  private timer = 0;
  private apiError = false;

  /** What the embed last told us; `stamp` is when, so the position can run on between updates. */
  private s = { paused: true, buffering: false, duration: 0, position: 0, stamp: 0, uri: '' };
  /** Set when play was pressed and cleared by the next update from the embed. */
  private waiting = 0;
  /** While the wheel is scrubbing: where the track will be when it's let go (ms). */
  private scrub: number | null = null;
  private meta: Meta | null = null;
  private home: Meta | null = null;
  private metaFor = '';
  private menuOpen = false;
  private menuSel = 0;
  private menuItems: MenuItem[];

  private screen: HTMLElement;
  private barTitle: HTMLElement;
  private stateIco: HTMLElement;
  private art: HTMLElement;
  private title: HTMLElement;
  private sub: HTMLElement;
  private fill: HTMLElement;
  private elapsed: HTMLElement;
  private remain: HTMLElement;
  private menuEl: HTMLElement;
  private sheet: HTMLElement;
  private embedHost: HTMLElement;
  private scrubFrom = 0;

  constructor() {
    this.menuItems = [
      { label: 'Now Playing', run: () => this.setMenu(false) },
      { label: 'Spotify Player', run: () => (this.toggleSheet(true), this.setMenu(false)) },
      { label: 'Open in Spotify', run: () => window.open(webUrl(MUSIC.uri), '_blank', 'noopener') },
    ];

    this.barTitle = el('span', { class: 'pod-bar-t', text: 'Now Playing' });
    this.stateIco = el('span', { class: 'pod-state' });
    this.art = el('div', { class: 'pod-art', html: NOTE });
    this.title = el('div', { class: 'pod-title', text: 'Music' });
    this.sub = el('div', { class: 'pod-sub' });
    this.fill = el('div', { class: 'pod-fill' });
    this.elapsed = el('span', { text: '0:00' });
    this.remain = el('span', { text: '-0:00' });
    this.menuEl = el('div', { class: 'pod-menu' });

    this.screen = el(
      'div',
      { class: 'pod-lcd' },
      el('div', { class: 'pod-bar' }, this.barTitle, this.stateIco, el('span', { class: 'pod-batt' }, el('i'))),
      el(
        'div',
        { class: 'pod-now' },
        this.art,
        el('div', { class: 'pod-text' }, this.title, this.sub),
        el('div', { class: 'pod-prog' }, el('div', { class: 'pod-track' }, this.fill), el('div', { class: 'pod-times' }, this.elapsed, this.remain)),
      ),
      this.menuEl,
    );

    const key = (cls: string, label: string, html: string) => el('button', { class: `pod-key ${cls}`, type: 'button', 'aria-label': label, title: label, html });
    const keys: [HTMLElement, () => void][] = [
      [key('k-menu', 'Menu', 'MENU'), () => this.setMenu(!this.menuOpen)],
      [key('k-prev', 'Back to start', PREV), () => this.prev()],
      [key('k-next', 'Next', NEXT), () => this.next()],
      [key('k-play', 'Play / Pause', PLAYPAUSE), () => this.togglePlay()],
      [el('button', { class: 'pod-center', type: 'button', 'aria-label': 'Select' }), () => this.select()],
    ];
    const wheel = el('div', { class: 'pod-wheel' }, ...keys.map(([k]) => k));
    this.wireWheel(wheel, keys);

    const host = el('div', { class: 'pod-embed' });
    this.sheet = el(
      'div',
      { class: 'pod-sheet' },
      el('div', { class: 'pod-sheet-head' }, el('span', { text: 'Spotify' }), el('button', { class: 'aq-btn small', type: 'button', text: 'Done', onclick: () => this.toggleSheet(false) })),
      host,
    );

    const body = el('div', { class: 'pod-body' }, el('div', { class: 'pod-bezel' }, this.screen), wheel);
    this.el = el('div', { class: 'pod', 'aria-label': 'Music player' }, this.sheet, body);
    this.embedHost = host;
    this.wireMove(body);
    window.addEventListener('resize', () => this.place());
    this.render();
  }

  // ---------- Moving it around ----------

  /** Where the owner last left it (top-left corner, px), or null for the default spot in the top left. */
  private spot: { x: number; y: number } | null = loadSpot();

  /** Drag anywhere on the body except the wheel to move it. */
  private wireMove(body: HTMLElement) {
    body.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || (e.target as Element).closest('.pod-wheel')) return;
      e.preventDefault();
      const r = this.el.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      body.setPointerCapture(e.pointerId);
      this.el.classList.add('moving');
      const move = (m: PointerEvent) => {
        this.spot = { x: m.clientX - dx, y: m.clientY - dy };
        this.place();
      };
      const up = () => {
        this.el.classList.remove('moving');
        body.removeEventListener('pointermove', move);
        body.removeEventListener('pointerup', up);
        body.removeEventListener('pointercancel', up);
        if (this.spot) saveSpot(this.spot);
      };
      body.addEventListener('pointermove', move);
      body.addEventListener('pointerup', up);
      body.addEventListener('pointercancel', up);
    });
  }

  /** Puts it at `spot`, kept below the menu bar and fully on screen (the window may have shrunk since). */
  private place() {
    if (!this.spot) return;
    const { width, height } = this.el.getBoundingClientRect();
    const top = (this.el.offsetParent as HTMLElement | null)?.querySelector('.mac-menubar')?.getBoundingClientRect().bottom ?? 0;
    const x = Math.max(0, Math.min(window.innerWidth - width, this.spot.x));
    const y = Math.max(top, Math.min(window.innerHeight - height, this.spot.y));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  /** Called whenever the laptop opens: loads Spotify the first time (and retries if it failed before). */
  wake() {
    this.place();
    this.timer ||= window.setInterval(() => this.render(), 250);
    if (!this.started || (this.apiError && !this.ctl)) {
      this.started = true;
      this.apiError = false;
      void this.connect();
      void describe(MUSIC.uri).then((m) => {
        this.home = m;
        this.render();
      });
    }
  }

  /** After Shut Down the screen is hidden, so there's no need to redraw it. */
  sleep() {
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  /** Shut Down: the music stops. */
  pause() {
    if (this.ctl && !this.s.paused) {
      this.ctl.pause();
      this.s.position = this.position();
      this.s.paused = true;
    }
    this.setMenu(false);
    this.toggleSheet(false);
  }

  private async connect() {
    try {
      const api = await loadApi();
      api.createController(this.embedHost, { uri: MUSIC.uri, width: '100%', height: EMBED_H }, (c) => {
        this.ctl = c;
        c.addListener('playback_update', (e) => this.onUpdate(e.data as PlaybackUpdate));
        c.addListener('error', () => (this.sub.textContent = 'Spotify could not play that.'));
        this.render();
      });
    } catch {
      this.apiError = true;
      this.render();
    }
  }

  private onUpdate(d: PlaybackUpdate) {
    this.waiting = 0;
    this.s = { paused: d.isPaused, buffering: d.isBuffering, duration: d.duration, position: d.position, stamp: performance.now(), uri: d.playingURI ?? this.s.uri };
    // A reply means the embed works without a click inside it, so it can go back into hiding.
    if (!d.isPaused) this.toggleSheet(false);
    if (this.s.uri && this.s.uri !== this.metaFor) {
      const uri = this.s.uri;
      this.metaFor = uri;
      void describe(uri).then((m) => {
        if (this.metaFor === uri) {
          this.meta = m;
          this.render();
        }
      });
    }
    this.render();
  }

  // ---------- The wheel ----------

  /**
   * Presses on a key run it; dragging around the ring scrubs the track (or moves through the menu) instead.
   * Pointer events rather than clicks, so a drag that starts on a key doesn't also press it.
   */
  private wireWheel(wheel: HTMLElement, keys: [HTMLElement, () => void][]) {
    let drag: { id: number; last: number; turned: number; notch: number; key: (() => void) | null } | null = null;
    const angle = (e: PointerEvent) => {
      const r = wheel.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    wheel.addEventListener('pointerdown', (e) => {
      if (drag || e.button > 0) return;
      e.preventDefault();
      const hit = keys.find(([k]) => k.contains(e.target as Node));
      hit?.[0].classList.add('down');
      wheel.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, last: angle(e), turned: 0, notch: 0, key: hit?.[1] ?? null };
      play('button-down', 0.4);
    });
    wheel.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      // The centre button doesn't turn.
      if ((e.target as Element).closest('.pod-center') && drag.turned === 0) return;
      const a = angle(e);
      let d = a - drag.last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      drag.last = a;
      drag.turned += d;
      if (Math.abs(drag.turned) > 12 && drag.key) {
        drag.key = null;
        wheel.querySelector('.down')?.classList.remove('down');
      }
      const notch = Math.trunc(drag.turned / NOTCH_DEG);
      if (notch !== drag.notch) {
        this.turn(notch - drag.notch, drag.turned);
        drag.notch = notch;
      }
      if (!this.menuOpen && this.scrub !== null) this.turnScrub(drag.turned);
    });
    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const run = drag.key;
      drag = null;
      wheel.querySelector('.down')?.classList.remove('down');
      if (run) {
        play('button-up', 0.5);
        run();
      } else if (this.scrub !== null) this.endScrub();
    };
    wheel.addEventListener('pointerup', end);
    wheel.addEventListener('pointercancel', end);
  }

  /** One notch of the wheel: a tick, and the menu cursor or the scrub position moves. */
  private turn(notches: number, turned: number) {
    play('menu-hover', 0.8);
    if (this.menuOpen) {
      this.menuSel = Math.max(0, Math.min(this.menuItems.length - 1, this.menuSel + Math.sign(notches)));
      return this.render();
    }
    if (!this.ctl || !this.s.duration) return;
    if (this.scrub === null) {
      this.scrubFrom = this.position();
      this.scrub = this.scrubFrom;
    }
    this.turnScrub(turned);
  }

  private turnScrub(turned: number) {
    this.scrub = Math.max(0, Math.min(this.s.duration - 500, this.scrubFrom + (turned / 360) * SCRUB_PER_TURN * 1000));
    this.render();
  }

  private endScrub() {
    const to = this.scrub ?? 0;
    this.scrub = null;
    this.ctl?.seek(to / 1000);
    this.s.position = to;
    this.s.stamp = performance.now();
    this.render();
  }

  // ---------- Actions ----------

  private togglePlay() {
    if (!this.ctl) return this.wake();
    this.waiting = performance.now();
    this.ctl.togglePlay();
    // Flip right away; the embed's own update corrects it a moment later.
    this.s.position = this.position();
    this.s.paused = !this.s.paused;
    this.s.stamp = performance.now();
    this.render();
  }

  private select() {
    if (this.menuOpen) return this.menuItems[this.menuSel]?.run();
    this.togglePlay();
  }

  private prev() {
    if (!this.ctl || !this.s.uri) return;
    this.ctl.seek(0);
    this.s.position = 0;
    this.s.stamp = performance.now();
    this.render();
  }

  private next() {
    if (!this.ctl || !this.s.duration) return;
    this.ctl.seek(Math.max(0, this.s.duration / 1000 - 0.3));
  }

  private setMenu(open: boolean) {
    this.menuOpen = open;
    if (open) this.menuSel = 0;
    this.render();
  }

  private toggleSheet(open = !this.sheet.classList.contains('open')) {
    // Slides out above the player instead when there's no room below it.
    if (open) this.sheet.classList.toggle('up', this.el.getBoundingClientRect().bottom + this.sheet.offsetHeight + 40 > window.innerHeight);
    this.sheet.classList.toggle('open', open);
  }

  /** Where playback is now, running on from the last update while it plays. */
  private position() {
    const { paused, position, duration, stamp } = this.s;
    return paused ? position : Math.min(duration || Infinity, position + (performance.now() - stamp));
  }

  private render() {
    const { paused, buffering, duration } = this.s;
    const started = !!this.s.uri;
    const info = (started && this.meta) || this.home;
    const playing = started && !paused;

    if (this.waiting && performance.now() - this.waiting > STUCK_MS) {
      // The embed ignored us (some browsers want the click to land inside it). Slide it out so it can be pressed there.
      this.waiting = 0;
      this.s.paused = true;
      this.toggleSheet(true);
    }

    this.el.classList.toggle('playing', playing);
    this.stateIco.innerHTML = playing ? PLAYING : started ? PAUSED : '';

    this.title.textContent = this.apiError ? 'No Signal' : (info?.title ?? 'Music');
    this.sub.textContent = this.apiError
      ? 'Could not reach Spotify'
      : !this.ctl
        ? 'Warming up the tubes…'
        : !started
          ? 'Press ▶❙❙ to play'
          : buffering
            ? 'Buffering…'
            : duration && duration <= 31000
              ? '30-sec preview · log in to Spotify'
              : started && this.home && info !== this.home
                ? this.home.title
                : 'Playlist';

    const thumb = info?.thumb;
    const img = this.art.querySelector('img');
    if (thumb && img?.getAttribute('src') !== thumb) this.art.replaceChildren(el('img', { src: thumb, alt: '', referrerpolicy: 'no-referrer', draggable: 'false' }));
    else if (!thumb && img) this.art.innerHTML = NOTE;

    const pos = this.scrub ?? this.position();
    this.el.classList.toggle('scrubbing', this.scrub !== null);
    this.fill.style.width = duration ? `${Math.min(100, (pos / duration) * 100)}%` : '0%';
    this.elapsed.textContent = fmt(pos);
    this.remain.textContent = `-${fmt(duration - pos)}`;

    this.screen.classList.toggle('menu', this.menuOpen);
    this.barTitle.textContent = this.menuOpen ? 'Music' : 'Now Playing';
    if (this.menuOpen) {
      this.menuEl.replaceChildren(
        ...this.menuItems.map((m, i) => el('div', { class: `pod-row${i === this.menuSel ? ' sel' : ''}`, text: m.label })),
      );
    }
  }
}

import { el } from './dom';
import { play } from './sound';

const STICKY_KEY = 'laptop-sticky';

function readSticky() {
  try {
    return localStorage.getItem(STICKY_KEY) ?? 'Call home.\nWater the plant.\nStay determined.\nStay sane for the next 8 months';
  } catch {
    return '';
  }
}

/**
 * Dashboard (F12, or its Dock icon), the Tiger way: the screen dims, and widgets zoom in over everything. Three
 * widgets, all drawn in code: an analog clock, a calendar and a sticky note (its text is kept in localStorage).
 * Clicking anywhere that isn't a widget puts it away.
 */
export class Dashboard {
  readonly el: HTMLElement;
  private hands: { h: SVGElement; m: SVGElement; s: SVGElement } | null = null;
  private timer = 0;
  private cal: HTMLElement;
  private note: HTMLTextAreaElement;

  constructor() {
    const clock = this.clock();
    this.cal = el('div', { class: 'wd wd-cal' });
    this.note = el('textarea', { class: 'wd-note-text', spellcheck: 'false', 'aria-label': 'Sticky note' });
    this.note.value = readSticky();
    this.note.addEventListener('input', () => {
      try {
        localStorage.setItem(STICKY_KEY, this.note.value);
      } catch {
        // Storage blocked: the note lasts for this visit.
      }
    });
    const sticky = el('div', { class: 'wd wd-note' }, this.note);
    this.el = el('div', { class: 'dash' }, el('div', { class: 'dash-widgets' }, clock, this.cal, sticky), el('div', { class: 'dash-plus', 'aria-hidden': 'true', text: '+' }));
    this.el.addEventListener('pointerdown', (e) => {
      if (!(e.target as Element).closest('.wd')) this.hide();
    });
  }

  get isOpen() {
    return this.el.classList.contains('open');
  }

  toggle() {
    if (this.isOpen) this.hide();
    else this.show();
  }

  show() {
    if (this.isOpen) return;
    play('dashboard');
    this.renderCal();
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 1000);
    this.el.classList.add('open');
  }

  hide() {
    if (!this.isOpen) return false;
    play('dashboard', 0.6);
    window.clearInterval(this.timer);
    this.note.blur();
    this.el.classList.remove('open');
    return true;
  }

  private clock() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const r1 = i % 3 ? 40 : 36;
      return `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * 43}" y2="${50 - Math.cos(a) * 43}" stroke="#222" stroke-width="${i % 3 ? 1.2 : 2.6}"/>`;
    }).join('');
    svg.innerHTML =
      `<circle cx="50" cy="50" r="48" fill="#2a2a2e"/><circle cx="50" cy="50" r="45" fill="#f7f7f5"/>${ticks}` +
      `<line class="h" x1="50" y1="54" x2="50" y2="28" stroke="#222" stroke-width="4" stroke-linecap="round"/>` +
      `<line class="m" x1="50" y1="56" x2="50" y2="14" stroke="#222" stroke-width="2.6" stroke-linecap="round"/>` +
      `<line class="s" x1="50" y1="60" x2="50" y2="12" stroke="#d6362c" stroke-width="1.1"/><circle cx="50" cy="50" r="2.6" fill="#d6362c"/>` +
      `<circle cx="50" cy="50" r="45" fill="url(#wd-glass)"/><defs><linearGradient id="wd-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
    this.hands = { h: svg.querySelector('.h')!, m: svg.querySelector('.m')!, s: svg.querySelector('.s')! };
    return el('div', { class: 'wd wd-clock' }, svg, el('div', { class: 'wd-clock-city', text: 'Home' }));
  }

  private tick() {
    if (!this.hands) return;
    const d = new Date();
    const s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    this.hands.h.setAttribute('transform', `rotate(${h * 30} 50 50)`);
    this.hands.m.setAttribute('transform', `rotate(${m * 6} 50 50)`);
    this.hands.s.setAttribute('transform', `rotate(${s * 6} 50 50)`);
  }

  private renderCal() {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const cells = [
      ...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => el('span', { class: 'wd-cal-dow', text: x })),
      ...Array.from({ length: first }, () => el('span')),
      ...Array.from({ length: days }, (_, i) => el('span', { class: i + 1 === d.getDate() ? 'today' : '', text: String(i + 1) })),
    ];
    this.cal.replaceChildren(
      el(
        'div',
        { class: 'wd-cal-page' },
        el('div', { class: 'wd-cal-day', text: d.toLocaleDateString('en-US', { weekday: 'long' }) }),
        el('div', { class: 'wd-cal-num', text: String(d.getDate()) }),
        el('div', { class: 'wd-cal-month', text: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }),
      ),
      el('div', { class: 'wd-cal-grid' }, ...cells),
    );
  }
}

import { el } from '../dom';
import { play } from '../sound';

type Op = '+' | '−' | '×' | '÷';

/**
 * The Tiger Calculator: a small metal panel with an LCD and gel keys. Basic mode only, with the memory keys.
 * It takes the keyboard while its window is in front (digits, + - * /, Enter or =, Esc or C, Backspace).
 */
export class Calculator {
  readonly el: HTMLElement;
  private lcd: HTMLElement;
  private memEl: HTMLElement;
  private cur = '0';
  private acc: number | null = null;
  private op: Op | null = null;
  /** The next digit starts a new number (after an operator or =). */
  private fresh = true;
  private mem = 0;
  private keys = new Map<string, HTMLElement>();

  constructor() {
    this.lcd = el('div', { class: 'calc-num', text: '0' });
    this.memEl = el('div', { class: 'calc-mem' });
    const key = (label: string, cls = '', run: () => void) => {
      const b = el('button', { class: `calc-key ${cls}`, type: 'button', text: label });
      b.addEventListener('pointerdown', () => play('button-down', 0.4));
      b.addEventListener('click', () => {
        run();
        this.render();
      });
      this.keys.set(label, b);
      return b;
    };
    const digit = (d: string) => key(d, d === '0' ? 'wide' : '', () => this.digit(d));
    const op = (o: Op) => key(o, 'op', () => this.setOp(o));
    this.el = el(
      'div',
      { class: 'calc', 'data-drag': '' },
      el('div', { class: 'calc-lcd' }, this.memEl, this.lcd),
      el(
        'div',
        { class: 'calc-keys' },
        key('MC', 'mem', () => (this.mem = 0)),
        key('M+', 'mem', () => (this.mem += this.value)),
        key('M−', 'mem', () => (this.mem -= this.value)),
        key('MR', 'mem', () => this.show(this.mem)),
        key('C', 'clear', () => this.clear()),
        key('±', '', () => this.show(-this.value)),
        op('÷'),
        op('×'),
        digit('7'), digit('8'), digit('9'), op('−'),
        digit('4'), digit('5'), digit('6'), op('+'),
        digit('1'), digit('2'), digit('3'),
        key('=', 'eq', () => this.equals()),
        digit('0'),
        key('.', '', () => this.digit('.')),
      ),
    );
  }

  /** Keyboard input while the Calculator window is active. Returns true when the key was used. */
  onKey(e: KeyboardEvent): boolean {
    if (e.metaKey || e.ctrlKey) return false;
    const map: Record<string, string> = { '+': '+', '-': '−', '*': '×', x: '×', '/': '÷', '=': '=', Enter: '=', Escape: 'C', c: 'C', Delete: 'C', '.': '.', ',': '.' };
    const label = /^\d$/.test(e.key) ? e.key : map[e.key];
    if (e.key === 'Backspace') {
      if (!this.fresh) this.cur = this.cur.length > 1 ? this.cur.slice(0, -1) : '0';
      this.render();
      return true;
    }
    const b = label && this.keys.get(label);
    if (!b) return false;
    // Light the key up as if it were pressed, then do what it does.
    b.classList.add('down');
    setTimeout(() => b.classList.remove('down'), 110);
    b.click();
    return true;
  }

  private get value() {
    return Number(this.cur);
  }

  private digit(d: string) {
    if (this.fresh) {
      this.cur = d === '.' ? '0.' : d;
      this.fresh = false;
      return;
    }
    if (d === '.' && this.cur.includes('.')) return;
    if (this.cur.replace(/[-.]/g, '').length >= 12) return;
    this.cur = this.cur === '0' && d !== '.' ? d : this.cur + d;
  }

  private setOp(o: Op) {
    if (this.op && !this.fresh) this.equals();
    this.acc = this.value;
    this.op = o;
    this.fresh = true;
  }

  private equals() {
    if (this.op === null || this.acc === null) return;
    const a = this.acc, b = this.value;
    const r = { '+': a + b, '−': a - b, '×': a * b, '÷': b === 0 ? NaN : a / b }[this.op];
    this.op = null;
    this.acc = null;
    this.show(r);
  }

  private clear() {
    this.cur = '0';
    this.acc = null;
    this.op = null;
    this.fresh = true;
  }

  private show(n: number) {
    this.cur = Number.isFinite(n) ? String(Number(n.toPrecision(12))) : 'Error';
    this.fresh = true;
  }

  private render() {
    const n = this.cur === 'Error' ? this.cur : this.cur.length > 9 && !this.cur.includes('e') && Math.abs(this.value) >= 1e9 ? this.value.toExponential(5) : this.cur;
    this.lcd.textContent = n;
    this.lcd.classList.toggle('small', n.length > 10);
    this.memEl.textContent = this.mem ? 'M' : '';
    this.keys.forEach((k, label) => k.classList.toggle('lit', label === this.op && this.fresh));
  }
}

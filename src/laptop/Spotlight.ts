import type { DesktopNode } from './desktop';
import { allNodes, isPresent, SYSTEM_APPS } from './fs';
import { el } from './dom';
import { GLYPH, nodeIcon } from './icons';
import { play } from './sound';

const GROUPS: { label: string; test: (n: DesktopNode) => boolean }[] = [
  { label: 'Applications', test: (n) => n.type === 'app' },
  { label: 'Folders', test: (n) => n.type === 'folder' },
  { label: 'Documents', test: (n) => n.type === 'file' && n.icon !== 'image' },
  { label: 'Images', test: (n) => n.type === 'file' && n.icon === 'image' },
];

/** Everything Spotlight can find: the owner's things (minus the Trash) and the laptop's own apps. */
const all = () => [...allNodes().filter(isPresent), ...SYSTEM_APPS];

/** The search field under the magnifying glass: finds anything on the laptop by name, Enter opens it. */
export class Spotlight {
  readonly el: HTMLElement;
  private input: HTMLInputElement;
  private list: HTMLElement;
  private hits: DesktopNode[] = [];
  private rows: HTMLElement[] = [];
  private sel = 0;

  constructor(private openNode: (n: DesktopNode, origin?: DOMRect) => void) {
    this.input = el('input', { class: 'spot-input', type: 'text', placeholder: 'Spotlight', 'aria-label': 'Spotlight', autocomplete: 'off', spellcheck: 'false' });
    this.list = el('div', { class: 'spot-list' });
    this.el = el('div', { class: 'mac-popover spot' }, el('div', { class: 'spot-head' }, el('span', { class: 'spot-ico', html: GLYPH.search }), this.input), this.list);
    this.input.addEventListener('input', () => this.search());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.select(this.sel + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.openSelected();
      }
    });
  }

  get isOpen() {
    return this.el.classList.contains('open');
  }

  toggle(anchor: HTMLElement) {
    if (this.isOpen) return this.hide();
    const r = anchor.getBoundingClientRect();
    this.el.style.right = `${Math.max(4, window.innerWidth - r.right - 4)}px`;
    this.el.classList.add('open');
    play('menu-open');
    this.input.value = '';
    this.search();
    this.input.focus();
  }

  hide() {
    if (!this.isOpen) return false;
    this.el.classList.remove('open');
    this.input.blur();
    return true;
  }

  private search() {
    const q = this.input.value.trim().toLowerCase();
    this.hits = [];
    this.rows = [];
    if (!q) {
      this.list.replaceChildren();
      return;
    }
    const found = all().filter((n) => n.name.toLowerCase().includes(q));
    // Names that start with the query rank first, like the real thing's "Top Hit".
    found.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));
    const parts: HTMLElement[] = [];
    const add = (label: string, nodes: DesktopNode[]) => {
      if (!nodes.length) return;
      parts.push(el('div', { class: 'spot-group', text: label }));
      for (const n of nodes) {
        const i = this.hits.length;
        this.hits.push(n);
        const row = el('button', { class: 'spot-row', type: 'button' }, el('span', { class: 'spot-row-ico', html: nodeIcon(n) }), el('span', { text: n.name }));
        row.addEventListener('pointerenter', () => this.select(i));
        row.addEventListener('click', () => {
          this.sel = i;
          this.openSelected();
        });
        this.rows.push(row);
        parts.push(row);
      }
    };
    if (found.length) add('Top Hit', [found[0]]);
    for (const g of GROUPS) add(g.label, found.slice(1).filter(g.test));
    if (!found.length) parts.push(el('div', { class: 'spot-none', text: 'No results' }));
    this.list.replaceChildren(...parts);
    this.select(0);
  }

  private select(i: number) {
    if (!this.rows.length) return;
    this.sel = Math.max(0, Math.min(this.rows.length - 1, i));
    this.rows.forEach((r, k) => r.classList.toggle('sel', k === this.sel));
    this.rows[this.sel].scrollIntoView({ block: 'nearest' });
  }

  private openSelected() {
    const n = this.hits[this.sel];
    if (!n) return play('alert');
    const origin = this.rows[this.sel]?.querySelector('.spot-row-ico')?.getBoundingClientRect();
    this.hide();
    this.openNode(n, origin);
  }
}

import { DESKTOP, type DesktopApp, type DesktopFile, type DesktopFolder, type DesktopNode } from './desktop';
import { el } from './dom';
import { allApps, dateOf, fmtDate, fmtSize, isPresent, sizeOf, trashItems } from './fs';
import { GLYPH, ICON, nodeIcon } from './icons';
import type { MenuEntry } from './MenuBar';
import { play } from './sound';

/** Where a Finder window is looking. `desktop` is the top level of DESKTOP without the apps; `apps` is just the apps. */
export type Loc = { kind: 'hd' } | { kind: 'desktop' } | { kind: 'apps' } | { kind: 'trash' } | { kind: 'folder'; trail: DesktopFolder[] };
export type View = 'grid' | 'list' | 'columns';
type SortKey = 'name' | 'date' | 'size' | 'kind';

export interface FinderHost {
  /** `origin` is the icon that was opened, so the window can grow out of it. */
  openFile(file: DesktopFile, origin?: DOMRect): void;
  launch(app: DesktopApp, origin?: DOMRect): void;
  /** The window's location or view changed (title, menus and the Go/View checkmarks may need a refresh). */
  changed(view: FinderView): void;
  /** A right-click menu for the selected item (`node`) or for the window's background. */
  menu(view: FinderView, x: number, y: number, node: DesktopNode | null): void;
  /** System and Library: "you do not have sufficient access privileges". */
  denied(name: string): void;
  emptyTrash(view: FinderView): void;
}

/** Stand-ins for what Macintosh HD contains. Opening the first two goes to the `apps` / `desktop` locations. */
const HD_ITEMS: DesktopFolder[] = [
  { type: 'folder', id: '__apps', name: 'Applications', children: [] },
  { type: 'folder', id: '__desktop', name: 'Desktop', children: [] },
  { type: 'folder', id: '__locked-library', name: 'Library', children: [] },
  { type: 'folder', id: '__locked-system', name: 'System', children: [] },
];

export const kindOf = (n: DesktopNode) => (n.type === 'folder' ? 'Folder' : n.type === 'app' ? 'Application' : n.icon === 'image' ? 'JPEG image' : n.icon === 'pdf' ? 'PDF document' : n.icon === 'link' ? 'Internet Location' : /\.md$/i.test(n.name) ? 'Markdown document' : 'Plain Text Document');

export function itemsOf(loc: Loc): DesktopNode[] {
  switch (loc.kind) {
    case 'hd':
      return HD_ITEMS;
    case 'desktop':
      return DESKTOP.filter((n) => n.type !== 'app' && isPresent(n));
    case 'apps':
      return allApps();
    case 'trash':
      return trashItems();
    case 'folder':
      return loc.trail[loc.trail.length - 1].children.filter(isPresent);
  }
}

export function locName(loc: Loc): string {
  switch (loc.kind) {
    case 'hd':
      return 'Macintosh HD';
    case 'desktop':
      return 'Desktop';
    case 'apps':
      return 'Applications';
    case 'trash':
      return 'Trash';
    case 'folder':
      return loc.trail[loc.trail.length - 1].name;
  }
}

export function locIcon(loc: Loc): string {
  switch (loc.kind) {
    case 'hd':
      return ICON.hd;
    case 'desktop':
      return ICON.desktopFolder;
    case 'apps':
      return ICON.appsFolder;
    case 'trash':
      return trashItems().length ? ICON.trashFull : ICON.trash;
    case 'folder':
      return nodeIcon(loc.trail[loc.trail.length - 1]);
  }
}

const sameLoc = (a: Loc, b: Loc) =>
  a.kind === b.kind && (a.kind !== 'folder' || (b.kind === 'folder' && a.trail.length === b.trail.length && a.trail.every((f, i) => f === b.trail[i])));

/** Double-click / double-tap window, in ms. Touch double-taps don't reliably fire `dblclick`, so we time clicks ourselves. */
export const DOUBLE_MS = 450;
/** Typing a name selects the first match; letters typed within this long add to the same search. */
const TYPE_MS = 900;

/** The folder a node opens to in this window, or null if it isn't a folder. */
function folderLoc(base: Loc, node: DesktopNode): Loc | null {
  if (node.type !== 'folder') return null;
  if (node.id === '__apps') return { kind: 'apps' };
  if (node.id === '__desktop') return { kind: 'desktop' };
  const trail = base.kind === 'folder' ? [...base.trail, node] : [node];
  return { kind: 'folder', trail };
}

/**
 * The inside of a Finder window: toolbar (back/forward, the three views, search), sidebar, items, status bar.
 * Icon view, list view (sortable columns) and column view (the Mac OS X browser: one column per folder level).
 */
export class FinderView {
  readonly el: HTMLElement;
  loc: Loc;
  view: View = 'grid';
  private history: Loc[] = [];
  private at = 0;
  private sel = -1;
  private last = { i: -1, t: 0 };
  private query = '';
  private typed = { text: '', t: 0 };
  private sort: { key: SortKey; up: boolean } = { key: 'name', up: true };
  private content: HTMLElement;
  private side: HTMLElement;
  private bar: HTMLElement;
  private back_: HTMLButtonElement;
  private fwd_: HTMLButtonElement;
  private search: HTMLInputElement;
  private status: HTMLElement;
  private viewBtns: HTMLButtonElement[] = [];
  private rows: HTMLElement[] = [];
  private shown: DesktopNode[] = [];
  /** Column view: the folder the columns start from, and the folders opened to the right of it. */
  private colBase: Loc = { kind: 'hd' };
  private colPath: DesktopNode[] = [];

  constructor(private host: FinderHost, start: Loc) {
    this.loc = start;
    this.history = [start];

    const seg = (glyph: string, label: string, run: () => void) => {
      const b = el('button', { class: 'aq-seg', type: 'button', html: glyph, 'aria-label': label, 'data-tip': label });
      b.addEventListener('pointerdown', () => play('button-down', 0.6));
      b.addEventListener('click', run);
      return b;
    };
    this.back_ = seg(GLYPH.back, 'Back', () => this.back());
    this.fwd_ = seg(GLYPH.forward, 'Forward', () => this.forward());
    this.viewBtns = [seg(GLYPH.grid, 'as Icons', () => this.setView('grid')), seg(GLYPH.list, 'as List', () => this.setView('list')), seg(GLYPH.columns, 'as Columns', () => this.setView('columns'))];
    this.search = el('input', { class: 'aq-search-input', type: 'search', placeholder: 'Search', 'aria-label': 'Search' });
    this.search.addEventListener('input', () => {
      this.query = this.search.value.trim().toLowerCase();
      this.sel = -1;
      this.render();
    });
    this.bar = el(
      'div',
      { class: 'fin-bar', 'data-drag': '' },
      el('div', { class: 'aq-segs' }, this.back_, this.fwd_),
      el('div', { class: 'aq-segs' }, ...this.viewBtns),
      el('div', { class: 'fin-spacer' }),
      el('label', { class: 'aq-search' }, el('span', { class: 'aq-search-ico', html: GLYPH.search }), this.search),
    );

    this.content = el('div', { class: 'fin-content', onclick: () => this.select(-1) });
    this.content.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!(e.target as Element).closest('.fin-item, .fin-row:not(.head), .fin-col-row')) this.select(-1);
      this.host.menu(this, e.clientX, e.clientY, this.selected ?? null);
    });
    this.status = el('div', { class: 'fin-status', 'data-drag': '' });
    this.side = el('aside', { class: 'fin-side' });
    this.el = el('div', { class: 'fin' }, this.bar, el('div', { class: 'fin-body' }, this.side, el('div', { class: 'fin-main' }, this.content)), this.status);
    this.render();
  }

  title() {
    return locName(this.loc);
  }

  icon() {
    return locIcon(this.loc);
  }

  get canBack() {
    return this.at > 0;
  }
  get canForward() {
    return this.at < this.history.length - 1;
  }
  get canUp() {
    return this.loc.kind === 'folder' || this.loc.kind === 'desktop' || this.loc.kind === 'apps';
  }
  get selected(): DesktopNode | undefined {
    return this.shown[this.sel];
  }
  get isTrash() {
    return this.loc.kind === 'trash';
  }

  /** The toolbar pill: hides the toolbar and the sidebar, like Mac OS X 10.0 to 10.6. */
  toggleToolbar() {
    this.el.classList.toggle('bare');
  }

  get toolbarShown() {
    return !this.el.classList.contains('bare');
  }

  go(loc: Loc) {
    if (sameLoc(loc, this.loc)) return;
    this.history = this.history.slice(0, this.at + 1);
    this.history.push(loc);
    this.at = this.history.length - 1;
    this.moveTo(loc);
  }

  back() {
    if (this.canBack) this.moveTo(this.history[--this.at]);
  }

  forward() {
    if (this.canForward) this.moveTo(this.history[++this.at]);
  }

  /** Enclosing folder: out of a folder, from a top-level folder to the Desktop, from Desktop/Applications to the disk. */
  up() {
    if (this.loc.kind === 'desktop' || this.loc.kind === 'apps') return this.go({ kind: 'hd' });
    if (this.loc.kind !== 'folder') return;
    const trail = this.loc.trail.slice(0, -1);
    this.go(trail.length ? { kind: 'folder', trail } : { kind: 'desktop' });
  }

  setView(v: View) {
    if (this.view === v) return;
    this.view = v;
    if (v === 'columns') {
      this.colBase = this.loc;
      this.colPath = [];
    }
    this.render();
    this.host.changed(this);
  }

  /** Re-reads the items, e.g. after something moved to the Trash. */
  refresh() {
    this.render();
    this.host.changed(this);
  }

  select(i: number) {
    this.sel = i;
    this.rows.forEach((r, k) => r.classList.toggle('sel', k === i));
    this.rows[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** Arrow keys. In the icon grid up/down jump a whole row; in columns left/right move between columns. */
  move(dir: 'up' | 'down' | 'left' | 'right') {
    if (this.view === 'columns') return this.moveColumns(dir);
    const n = this.shown.length;
    if (!n) return;
    const forward = dir === 'down' || dir === 'right';
    let step = 1;
    if (this.view === 'grid' && (dir === 'up' || dir === 'down') && this.rows.length > 1) {
      const top = this.rows[0].offsetTop;
      step = Math.max(1, this.rows.filter((r) => r.offsetTop === top).length);
    }
    if (this.view === 'list' && (dir === 'left' || dir === 'right')) return;
    if (this.sel < 0) return this.select(forward ? 0 : n - 1);
    this.select(Math.min(n - 1, Math.max(0, this.sel + (forward ? step : -step))));
  }

  openSelected() {
    if (this.sel >= 0) this.open(this.sel);
  }

  /** Type-to-select: letters typed quickly one after another jump to the first name starting with them. */
  typeSelect(ch: string) {
    const now = performance.now();
    this.typed = { text: (now - this.typed.t < TYPE_MS ? this.typed.text : '') + ch.toLowerCase(), t: now };
    const i = this.shown.findIndex((n) => n.name.toLowerCase().startsWith(this.typed.text));
    if (i >= 0) this.select(i);
    else play('alert', 0.5);
  }

  private moveTo(loc: Loc) {
    this.loc = loc;
    this.sel = -1;
    this.query = '';
    this.search.value = '';
    this.colBase = loc;
    this.colPath = [];
    this.render();
    this.host.changed(this);
  }

  /** Folders open in this same window; files and apps hand over to the host. */
  private open(i: number) {
    const node = this.shown[i];
    if (!node) return;
    const origin = this.rows[i]?.querySelector('.fin-ico, .c-ico, .col-ico')?.getBoundingClientRect();
    if (node.id.startsWith('__locked')) return this.host.denied(node.name);
    if (this.isTrash) return play('alert');
    const loc = folderLoc(this.loc, node);
    if (loc) {
      if (this.view === 'columns') return this.moveColumns('right');
      return this.go(loc);
    }
    if (node.type === 'file') this.host.openFile(node, origin);
    else if (node.type === 'app') this.host.launch(node, origin);
  }

  private click(i: number, e: MouseEvent) {
    e.stopPropagation();
    const now = e.timeStamp;
    if (this.last.i === i && now - this.last.t < DOUBLE_MS) {
      this.last = { i: -1, t: 0 };
      this.open(i);
      return;
    }
    this.last = { i, t: now };
    this.select(i);
  }

  private sorted(items: DesktopNode[]) {
    const { key, up } = this.sort;
    const val = (n: DesktopNode): string | number => (key === 'name' ? n.name.toLowerCase() : key === 'date' ? dateOf(n).getTime() : key === 'size' ? sizeOf(n) : kindOf(n));
    return [...items].sort((a, b) => {
      const x = val(a), y = val(b);
      const c = x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
      return up ? c : -c;
    });
  }

  private render() {
    this.renderSide();
    const all = itemsOf(this.loc);
    const items = this.query ? all.filter((n) => n.name.toLowerCase().includes(this.query)) : all;
    this.back_.disabled = !this.canBack;
    this.fwd_.disabled = !this.canForward;
    this.viewBtns.forEach((b, k) => b.classList.toggle('on', ['grid', 'list', 'columns'][k] === this.view));
    const count = items.length === 1 ? '1 item' : `${items.length} items`;
    this.status.textContent = this.query ? `${count} found` : `${count}, 42 GB available`;

    this.content.classList.toggle('list', this.view === 'list');
    this.content.classList.toggle('columns', this.view === 'columns');
    this.rows = [];
    if (this.view === 'columns') return this.renderColumns();
    this.shown = this.view === 'list' ? this.sorted(items) : items;
    if (this.view === 'grid') {
      this.content.replaceChildren(
        ...this.shown.map((n, i) => {
          const row = el(
            'div',
            { class: 'fin-item', onclick: (e: MouseEvent) => this.click(i, e), oncontextmenu: () => this.select(i) },
            el('div', { class: 'fin-ico', html: nodeIcon(n) }),
            el('div', { class: 'fin-name', text: n.name }),
          );
          this.rows.push(row);
          return row;
        }),
      );
    } else {
      const col = (key: SortKey, label: string, cls: string) => {
        const on = this.sort.key === key;
        const h = el('button', { class: `${cls}${on ? ' sorted' : ''}`, type: 'button' }, el('span', { text: label }), on ? el('span', { class: 'sort-arrow', text: this.sort.up ? '▲' : '▼' }) : null);
        h.addEventListener('click', (e) => {
          e.stopPropagation();
          play('click', 0.5);
          this.sort = { key, up: on ? !this.sort.up : true };
          this.render();
        });
        return h;
      };
      const head = el('div', { class: 'fin-row head' }, col('name', 'Name', 'c-name'), col('date', 'Date Modified', 'c-date'), col('size', 'Size', 'c-size'), col('kind', 'Kind', 'c-kind'));
      this.content.replaceChildren(
        head,
        ...this.shown.map((n, i) => {
          const row = el(
            'div',
            { class: `fin-row${i % 2 ? ' alt' : ''}`, onclick: (e: MouseEvent) => this.click(i, e), oncontextmenu: () => this.select(i) },
            el('span', { class: 'c-name' }, el('span', { class: 'c-ico', html: nodeIcon(n) }), el('span', { text: n.name })),
            el('span', { class: 'c-date', text: n.id.startsWith('__') ? '--' : fmtDate(dateOf(n)) }),
            el('span', { class: 'c-size', text: n.type === 'folder' ? '--' : fmtSize(sizeOf(n)) }),
            el('span', { class: 'c-kind', text: kindOf(n) }),
          );
          this.rows.push(row);
          return row;
        }),
      );
    }
    if (!this.shown.length) this.content.append(el('div', { class: 'fin-empty', text: this.query ? 'No matches' : this.isTrash ? 'Trash is empty' : 'This folder is empty' }));
    this.select(Math.min(this.sel, this.shown.length - 1));
  }

  // ---------- Column view ----------

  /** The location shown in column `k`: the base folder, then each folder picked to the right of it. */
  private colLocOf(k: number): Loc {
    let loc = this.colBase;
    for (const n of this.colPath.slice(0, k)) loc = folderLoc(loc, n) ?? loc;
    return loc;
  }

  /**
   * One column per level, left to right. Selection (`sel`/`shown`/`rows`) always means the deepest column that has
   * a selection, so the menus, Get Info and Enter work the same as in the other views. A selected file gets a preview
   * column with its big icon and details, like the real thing.
   */
  private renderColumns() {
    const cols: HTMLElement[] = [];
    let active: { items: DesktopNode[]; rows: HTMLElement[]; sel: number } | null = null;
    for (let k = 0; k <= this.colPath.length; k++) {
      const loc = this.colLocOf(k);
      let items = itemsOf(loc);
      if (k === 0 && this.query) items = items.filter((n) => n.name.toLowerCase().includes(this.query));
      const picked = this.colPath[k];
      const rows = items.map((n, i) => {
        const r = el(
          'div',
          { class: `fin-col-row${n === picked ? (k === this.colPath.length - 1 ? ' sel' : ' path') : ''}` },
          el('span', { class: 'col-ico', html: nodeIcon(n) }),
          el('span', { class: 'col-name', text: n.name }),
          n.type === 'folder' ? el('span', { class: 'col-arrow', text: '▶' }) : null,
        );
        r.addEventListener('click', (e) => {
          e.stopPropagation();
          const dbl = this.last.i === i + k * 1000 && e.timeStamp - this.last.t < DOUBLE_MS;
          this.last = { i: i + k * 1000, t: e.timeStamp };
          if (n.id.startsWith('__locked') && dbl) return this.host.denied(n.name);
          this.pickColumn(k, n);
          if (dbl && n.type !== 'folder') this.openSelected();
        });
        r.addEventListener('contextmenu', () => this.pickColumn(k, n));
        return r;
      });
      if (k === Math.max(0, this.colPath.length - 1)) active = { items, rows, sel: picked ? items.indexOf(picked) : -1 };
      cols.push(el('div', { class: 'fin-col' }, ...rows, items.length ? null : el('div', { class: 'fin-col-empty', text: 'Empty' })));
    }
    const last = this.colPath[this.colPath.length - 1];
    if (last && last.type !== 'folder') {
      cols.push(
        el(
          'div',
          { class: 'fin-col preview' },
          el('div', { class: 'col-big', html: nodeIcon(last) }),
          el('div', { class: 'col-pv-name', text: last.name }),
          el('div', { class: 'col-pv-row', text: `Kind: ${kindOf(last)}` }),
          el('div', { class: 'col-pv-row', text: `Size: ${fmtSize(sizeOf(last))}` }),
          el('div', { class: 'col-pv-row', text: `Modified: ${fmtDate(dateOf(last))}` }),
        ),
      );
    }
    this.content.replaceChildren(...cols);
    this.shown = active?.items ?? [];
    this.rows = active?.rows ?? [];
    this.sel = active?.sel ?? -1;
    requestAnimationFrame(() => (this.content.scrollLeft = this.content.scrollWidth));
  }

  /** Clicking an item in column `k`: it becomes the selection, and a folder opens in the next column. */
  private pickColumn(k: number, n: DesktopNode) {
    this.colPath = [...this.colPath.slice(0, k), n];
    this.renderColumns();
    this.host.changed(this);
  }

  private moveColumns(dir: 'up' | 'down' | 'left' | 'right') {
    const k = Math.max(0, this.colPath.length - 1);
    const items = itemsOf(this.colLocOf(this.colPath.length ? k : 0));
    const cur = this.colPath[k];
    if (dir === 'left') {
      if (this.colPath.length > 1) {
        this.colPath = this.colPath.slice(0, -1);
        this.renderColumns();
      }
      return;
    }
    if (dir === 'right') {
      if (cur?.type === 'folder' && !cur.id.startsWith('__locked')) {
        const next = itemsOf(this.colLocOf(this.colPath.length));
        if (next.length) this.pickColumn(this.colPath.length, next[0]);
      }
      return;
    }
    if (!items.length) return;
    const i = cur ? items.indexOf(cur) : -1;
    const j = Math.max(0, Math.min(items.length - 1, i + (dir === 'down' ? 1 : -1)));
    this.pickColumn(this.colPath.length ? k : 0, items[i < 0 ? 0 : j]);
  }

  private renderSide() {
    const entry = (label: string, icon: string, loc: Loc) => {
      const b = el(
        'button',
        { class: `fin-side-item${sameLoc(loc, this.loc) ? ' on' : ''}`, type: 'button', onclick: () => this.go(loc) },
        el('span', { class: 'fin-side-ico', html: icon }),
        el('span', { class: 'fin-side-label', text: label }),
      );
      return b;
    };
    const folders = DESKTOP.filter((n): n is DesktopFolder => n.type === 'folder' && isPresent(n));
    const trash = entry('Trash', trashItems().length ? ICON.trashFull : ICON.trash, { kind: 'trash' });
    this.side.replaceChildren(
      el('div', { class: 'fin-side-head', text: 'Devices' }),
      entry('Macintosh HD', ICON.hd, { kind: 'hd' }),
      el('div', { class: 'fin-side-head', text: 'Places' }),
      entry('Desktop', ICON.desktopFolder, { kind: 'desktop' }),
      entry('Applications', ICON.appsFolder, { kind: 'apps' }),
      ...folders.map((f) => entry(f.name, nodeIcon(f), { kind: 'folder', trail: [f] })),
      el('div', { class: 'fin-side-sep' }),
      trash,
    );
    // The Trash window gets an Empty button in its toolbar, like Leopard's.
    this.bar.querySelector('.fin-empty-btn')?.remove();
    if (this.isTrash && trashItems().length) {
      const b = el('button', { class: 'aq-btn small fin-empty-btn', type: 'button', text: 'Empty' });
      b.addEventListener('click', () => this.host.emptyTrash(this));
      this.bar.append(b);
    }
  }

  /** Items a right-click menu can offer for the window's background. */
  backgroundMenu(): MenuEntry[] {
    return [
      { label: 'New Folder', disabled: true },
      'sep',
      { label: 'as Icons', checked: this.view === 'grid', run: () => this.setView('grid') },
      { label: 'as List', checked: this.view === 'list', run: () => this.setView('list') },
      { label: 'as Columns', checked: this.view === 'columns', run: () => this.setView('columns') },
    ];
  }
}

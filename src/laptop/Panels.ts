import { USER, type DesktopNode } from './desktop';
import { el } from './dom';
import { kindOf } from './Finder';
import { dateOf, fmtDate, fmtSize, sizeOf, whereOf } from './fs';
import { nodeIcon } from './icons';
import { play } from './sound';

/** A disclosure triangle section, the way Get Info and System Profiler fold their parts away. */
function section(title: string, open: boolean, ...body: (HTMLElement | null)[]) {
  const box = el('div', { class: `info-sec${open ? ' open' : ''}` });
  const head = el('button', { class: 'info-head', type: 'button' }, el('span', { class: 'info-tri', text: '▶' }), el('span', { text: title }));
  head.addEventListener('click', () => {
    play('click', 0.5);
    box.classList.toggle('open');
  });
  box.append(head, el('div', { class: 'info-body' }, ...body));
  return box;
}

const kv = (k: string, v: string) => el('div', { class: 'info-kv' }, el('span', { class: 'k', text: `${k}:` }), el('span', { class: 'v', text: v }));

/** File > Get Info (⌘I): the tall Tiger inspector with its fold-out sections. */
export function getInfo(n: DesktopNode): HTMLElement {
  const app = n.type === 'app';
  const openWith = n.type === 'file' ? (n.icon === 'image' || n.icon === 'pdf' ? 'Preview' : n.icon === 'link' ? 'Safari' : 'TextEdit') : '';
  const lock = el('input', { type: 'checkbox', class: 'aq-check' });
  const comments = el('textarea', { class: 'info-comments', rows: '2', 'aria-label': 'Spotlight Comments' });
  const name = el('input', { class: 'info-name-input', type: 'text', value: n.name, readonly: '', 'aria-label': 'Name' });
  return el(
    'div',
    { class: 'info' },
    el(
      'div',
      { class: 'info-top', 'data-drag': '' },
      el('div', { class: 'info-ico', html: nodeIcon(n) }),
      el('div', { class: 'info-title' }, el('div', { class: 'info-name', text: n.name }), el('div', { class: 'info-size', text: fmtSize(sizeOf(n)) }), el('div', { class: 'info-mod', text: `Modified: ${fmtDate(dateOf(n))}` })),
    ),
    el(
      'div',
      { class: 'info-scroll' },
      section('Spotlight Comments:', false, comments),
      section(
        'General:',
        true,
        kv('Kind', kindOf(n)),
        kv('Size', `${fmtSize(sizeOf(n))} on disk`),
        kv('Where', whereOf(n)),
        kv('Created', fmtDate(dateOf(n))),
        kv('Modified', fmtDate(dateOf(n))),
        app ? kv('Version', '1.0 (Determination)') : null,
        el('label', { class: 'aq-check-label info-lock' }, lock, el('span', { text: 'Locked' })),
      ),
      section('More Info:', false, kv('Last opened', fmtDate(new Date()))),
      section('Name & Extension:', false, name),
      openWith ? section('Open with:', false, el('select', { class: 'aq-popup', disabled: '' }, el('option', { text: openWith }))) : null,
      section('Preview:', false, el('div', { class: 'info-preview', html: nodeIcon(n) })),
      section('Ownership & Permissions:', false, kv('You can', 'Read & Write'), kv('Owner', USER.short), kv('Group', 'staff')),
    ),
  );
}

/** About This Mac > More Info…: System Profiler, half pretend hardware, half the real browser it runs in. */
export function systemProfiler(): HTMLElement {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const pages: Record<string, [string, string][]> = {
    Hardware: [
      ['Machine Name', USER.computer],
      ['Machine Model', 'PowerBook G4 15"'],
      ['CPU Type', 'PowerPC G4 (1.5)'],
      ['Number Of CPUs', String(Math.max(1, Math.min(2, nav.hardwareConcurrency ?? 1)))],
      ['CPU Speed', '1.67 GHz'],
      ['L2 Cache (per CPU)', '512 KB'],
      ['Memory', nav.deviceMemory ? `${nav.deviceMemory} GB` : '1 GB'],
      ['Bus Speed', '167 MHz'],
      ['Determination', 'Full'],
      ['Serial Number', 'LV-0001'],
    ],
    Displays: [
      ['Display Type', 'LCD'],
      ['Resolution', `${screen.width} x ${screen.height}`],
      ['Pixel Depth', `${screen.colorDepth}-Bit Color`],
      ['Built-In', 'Yes'],
    ],
    Network: [
      ['AirPort', navigator.onLine ? 'Connected' : 'Not connected'],
      ['Network', navigator.onLine ? 'Home' : '-'],
      ['Ethernet', 'Cable unplugged'],
    ],
    Software: [
      ['System Version', 'Mac OS X 10.5 Determination'],
      ['Kernel Version', 'Darwin 9.8.0'],
      ['Boot Volume', 'Macintosh HD'],
      ['Computer Name', USER.computer],
      ['User Name', `${USER.name} (${USER.short})`],
      ['Browser Language', navigator.language],
    ],
  };
  const table = el('div', { class: 'prof-table' });
  const side = el('div', { class: 'prof-side' });
  const show = (name: string) => {
    side.querySelectorAll('.prof-item').forEach((b) => b.classList.toggle('on', b.textContent === name));
    table.replaceChildren(
      el('div', { class: 'prof-h', text: `${name} Overview:` }),
      ...pages[name].map(([k, v], i) => el('div', { class: `prof-row${i % 2 ? ' alt' : ''}` }, el('span', { class: 'k', text: `${k}:` }), el('span', { text: v }))),
    );
  };
  side.append(
    el('div', { class: 'prof-group', text: 'Contents' }),
    ...Object.keys(pages).map((name) => {
      const b = el('button', { class: 'prof-item', type: 'button', text: name });
      b.addEventListener('click', () => (play('click', 0.5), show(name)));
      return b;
    }),
  );
  show('Hardware');
  return el('div', { class: 'prof' }, side, table);
}

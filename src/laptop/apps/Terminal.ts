import { DESKTOP, USER, type DesktopNode } from '../desktop';
import { el } from '../dom';
import { allApps, docText, isPresent } from '../fs';

export interface TerminalHost {
  /** `open <thing>`: hands the node to the laptop, which opens it like a double-click. */
  open(n: DesktopNode): void;
  /** `exit`: closes the window. */
  exit(): void;
}

/** A directory in the pretend Unix tree. The owner's DESKTOP is ~/Desktop; apps are in /Applications. */
interface Dir {
  name: string;
  kids: () => (Dir | DesktopNode)[];
}

const isDir = (x: Dir | DesktopNode): x is Dir => 'kids' in x;
const nameOf = (x: Dir | DesktopNode) => x.name;

const visible = (nodes: DesktopNode[]) => nodes.filter(isPresent);
const folderDir = (n: DesktopNode & { type: 'folder' }): Dir => ({ name: n.name, kids: () => visible(n.children).map((c) => (c.type === 'folder' ? folderDir(c) : c)) });

const HOME: Dir = {
  name: USER.short,
  kids: () => [
    { name: 'Desktop', kids: () => visible(DESKTOP.filter((n) => n.type !== 'app')).map((n) => (n.type === 'folder' ? folderDir(n) : n)) },
    { name: 'Documents', kids: () => [] },
    { name: 'Library', kids: () => [] },
    { name: 'Music', kids: () => [] },
  ],
};
const APPS: Dir = { name: 'Applications', kids: () => allApps() };
const ROOT: Dir = {
  name: '',
  kids: () => [APPS, { name: 'System', kids: () => [] }, { name: 'Users', kids: () => [HOME] }],
};

const FORTUNES = [
  'You will walk to the couch. You will sit. It will be enough.',
  'Determination is a renewable resource.',
  'Today is a good day to empty the Trash.',
  'The fridge is not going to examine itself.',
  'A tidy desktop is a sign of a tidy mind. Or an empty one.',
  'Real artists ship.',
];

/**
 * Terminal.app with a tiny pretend shell: ls, cd, pwd, cat, open, echo, say, date, cal, uname, whoami, history,
 * clear, fortune, exit… over the laptop's own files. White window, Monaco, the Tiger default.
 */
export class Terminal {
  readonly el: HTMLElement;
  private out: HTMLElement;
  private input: HTMLInputElement;
  private promptEl: HTMLElement;
  private cwd: Dir[] = [ROOT, ROOT.kids()[2] as Dir, HOME];
  private history: string[] = [];
  private hi = 0;

  constructor(private host: TerminalHost) {
    this.out = el('div', { class: 'term-out' });
    this.promptEl = el('span', { class: 'term-prompt' });
    this.input = el('input', { class: 'term-input', type: 'text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Terminal input' });
    this.input.addEventListener('keydown', (e) => this.key(e));
    this.el = el('div', { class: 'term', onclick: () => this.input.focus() }, this.out, el('div', { class: 'term-line' }, this.promptEl, this.input));
    const last = new Date(Date.now() - 1000 * 60 * 60 * 26);
    this.print(`Last login: ${last.toDateString().slice(0, 10)} ${last.toTimeString().slice(0, 8)} on ttyp1`);
    this.print('Welcome to Darwin!');
    this.renderPrompt();
  }

  focus() {
    this.input.focus();
  }

  private get here() {
    return this.cwd[this.cwd.length - 1];
  }

  private pwd(trail = this.cwd) {
    return trail.length === 1 ? '/' : trail.map((d) => d.name).join('/');
  }

  private short() {
    const p = this.pwd();
    const home = this.pwd([ROOT, ROOT.kids()[2] as Dir, HOME]);
    return p === home ? '~' : p.startsWith(home + '/') ? '~' + p.slice(home.length) : p;
  }

  private renderPrompt() {
    const host = USER.computer.replace(/'/g, '').replace(/\s+/g, '-');
    const dir = this.here === HOME ? '~' : this.here === ROOT ? '/' : this.here.name;
    this.promptEl.textContent = `${host}:${dir} ${USER.short}$ `;
  }

  private print(text: string, cls = '') {
    this.out.append(el('div', { class: `term-row ${cls}`, text: text || ' ' }));
    this.el.scrollTop = this.el.scrollHeight;
  }

  /** Resolves `a/b`, `..`, `~`, `/Applications` from here. Returns the trail of dirs plus the final entry. */
  private resolve(path: string): { trail: Dir[]; node: Dir | DesktopNode } | null {
    let trail = path.startsWith('/') ? [ROOT] : path.startsWith('~') ? [ROOT, ROOT.kids()[2] as Dir, HOME] : [...this.cwd];
    const parts = path.replace(/^~/, '').split('/').filter(Boolean);
    let node: Dir | DesktopNode = trail[trail.length - 1];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p === '.') continue;
      if (p === '..') {
        if (trail.length > 1) trail = trail.slice(0, -1);
        node = trail[trail.length - 1];
        continue;
      }
      if (!isDir(node)) return null;
      const next: Dir | DesktopNode | undefined = node.kids().find((k) => nameOf(k).toLowerCase() === p.toLowerCase() || (isDir(k) ? false : k.type === 'app' && `${k.name}.app`.toLowerCase() === p.toLowerCase()));
      if (!next) return null;
      if (isDir(next)) trail = [...trail, next];
      node = next;
    }
    return { trail, node };
  }

  private key(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const line = this.input.value;
      this.print(this.promptEl.textContent + line, 'cmd');
      this.input.value = '';
      if (line.trim()) this.history.push(line);
      this.hi = this.history.length;
      this.run(line.trim());
      this.renderPrompt();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.hi = Math.max(0, Math.min(this.history.length, this.hi + (e.key === 'ArrowUp' ? -1 : 1)));
      this.input.value = this.history[this.hi] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.complete();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      this.out.replaceChildren();
    }
  }

  /** Tab completes the last word against the names in that directory. */
  private complete() {
    const v = this.input.value;
    const m = /(\S*)$/.exec(v)!;
    const word = m[1];
    const slash = word.lastIndexOf('/');
    const base = slash >= 0 ? word.slice(0, slash + 1) : '';
    const stem = word.slice(slash + 1).toLowerCase();
    const dir = base ? this.resolve(base)?.node : this.here;
    if (!dir || !isDir(dir)) return;
    const hits = dir.kids().map(nameOf).filter((n) => n.toLowerCase().startsWith(stem));
    if (hits.length === 1) this.input.value = v.slice(0, v.length - word.length) + base + hits[0].replace(/ /g, '\\ ') + (isDir(dir.kids().find((k) => k.name === hits[0])!) ? '/' : ' ');
    else if (hits.length > 1) this.print(hits.join('    '));
  }

  private run(line: string) {
    if (!line) return;
    // Split on spaces, keeping "quoted words" and back\ slashed spaces together.
    const args = (line.match(/"[^"]*"|'[^']*'|(?:\\ |\S)+/g) ?? []).map((a) => a.replace(/^["']|["']$/g, '').replace(/\\ /g, ' '));
    const cmd = args.shift()!;
    const say = (t: string) => this.print(t);
    switch (cmd) {
      case 'help':
        say('Commands: ls, cd, pwd, cat, open, echo, say, date, cal, uname, whoami, hostname, history, fortune, clear, exit');
        break;
      case 'ls': {
        const long = args[0] === '-l' || args[0] === '-la';
        const target = args.find((a) => !a.startsWith('-'));
        const r = target ? this.resolve(target) : { trail: this.cwd, node: this.here };
        if (!r) return say(`ls: ${target}: No such file or directory`);
        const items = isDir(r.node) ? r.node.kids() : [r.node];
        if (!long) return say(items.map((k) => (isDir(k) ? k.name : k.type === 'app' ? `${k.name}.app` : k.name)).join('    ') || '');
        for (const k of items) {
          const dir = isDir(k) || k.type === 'app';
          const size = isDir(k) || k.type !== 'file' ? 102 : docText(k).length;
          say(`${dir ? 'drwxr-xr-x' : '-rw-r--r--'}   1 ${USER.short}  staff  ${String(size).padStart(6)} Oct 15 2007 ${isDir(k) ? k.name : k.type === 'app' ? `${k.name}.app` : k.name}`);
        }
        break;
      }
      case 'cd': {
        const r = this.resolve(args[0] ?? '~');
        if (!r) return say(`cd: ${args[0]}: No such file or directory`);
        if (!isDir(r.node)) return say(`cd: ${args[0]}: Not a directory`);
        if (r.node.name === 'System') return say(`cd: ${args[0]}: Permission denied`);
        this.cwd = r.trail;
        break;
      }
      case 'pwd':
        say(this.pwd());
        break;
      case 'cat': {
        if (!args.length) return say('usage: cat file ...');
        for (const a of args) {
          const r = this.resolve(a);
          if (!r) say(`cat: ${a}: No such file or directory`);
          else if (isDir(r.node) || r.node.type !== 'file') say(`cat: ${a}: Is a directory`);
          else if (r.node.icon && r.node.icon !== 'text') say(`cat: ${a}: binary file (try: open ${a})`);
          else docText(r.node).split('\n').forEach((l) => say(l));
        }
        break;
      }
      case 'open': {
        const r = args[0] ? this.resolve(args[0]) : null;
        if (!r || isDir(r.node)) return say(args[0] ? `The file ${this.short()}/${args[0]} does not exist.` : 'usage: open file');
        this.host.open(r.node);
        break;
      }
      case 'echo':
        say(args.join(' '));
        break;
      case 'say': {
        const text = args.join(' ');
        if (text && 'speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        break;
      }
      case 'date':
        say(new Date().toString().replace(/ GMT.*$/, ''));
        break;
      case 'cal':
        this.cal();
        break;
      case 'uname':
        say(args[0] === '-a' ? `Darwin ${USER.computer.replace(/'/g, '').replace(/\s+/g, '-')}.local 9.8.0 Darwin Kernel Version 9.8.0: Determination; root:xnu-1228.15.4~1/RELEASE_PPC Power Macintosh` : 'Darwin');
        break;
      case 'whoami':
        say(USER.short);
        break;
      case 'hostname':
        say(`${USER.computer.replace(/'/g, '').replace(/\s+/g, '-')}.local`);
        break;
      case 'history':
        this.history.forEach((h, i) => say(`${String(i + 1).padStart(5)}  ${h}`));
        break;
      case 'fortune':
        say(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
        break;
      case 'clear':
        this.out.replaceChildren();
        break;
      case 'exit':
      case 'logout':
        say('logout');
        say('[Process completed]');
        setTimeout(() => this.host.exit(), 400);
        break;
      case 'sudo':
        say('Password:');
        say(`${USER.short} is not in the sudoers file.  This incident will be reported.`);
        break;
      case 'rm':
      case 'mv':
      case 'mkdir':
      case 'touch':
        say(`${cmd}: Read-only file system`);
        break;
      case 'man':
        say(args[0] ? `No manual entry for ${args[0]}` : 'What manual page do you want?');
        break;
      default:
        say(`-bash: ${cmd}: command not found`);
    }
  }

  private cal() {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const head = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
    this.print(head.padStart(10 + Math.ceil(head.length / 2)));
    this.print('Su Mo Tu We Th Fr Sa');
    let row = '   '.repeat(first);
    for (let i = 1; i <= days; i++) {
      row += String(i).padStart(2) + ' ';
      if ((first + i) % 7 === 0 || i === days) {
        this.print(row.trimEnd());
        row = '';
      }
    }
  }
}

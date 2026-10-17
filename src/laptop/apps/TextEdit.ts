import type { DesktopFile } from '../desktop';
import { el } from '../dom';
import { docText, saveDoc } from '../fs';
import { renderMarkdown } from '../markdown';

/**
 * A TextEdit document in plain-text mode (Monaco, like the real one): editable, with a ruler. ⌘S keeps the text in
 * localStorage (see fs.ts), so the owner can actually write in the files on the laptop. Unsaved changes put a dot
 * in the window's close button, and closing asks first (MacScreen shows the sheet).
 *
 * A `.md` file opens rendered (read-only, with a Rendered / Markdown switch above it); the Markdown side is the same
 * editable text area, so saving works the same way.
 */
export class TextDoc {
  readonly el: HTMLElement;
  readonly area: HTMLTextAreaElement;
  private ruler: HTMLElement;
  private saved: string;
  private rendered?: HTMLElement;
  private tabs: HTMLButtonElement[] = [];
  dirty = false;

  constructor(readonly file: DesktopFile, private onDirty: (dirty: boolean) => void) {
    this.saved = docText(file);
    this.area = el('textarea', { class: 'te-area', spellcheck: 'false', 'aria-label': file.name });
    this.area.value = this.saved;
    this.area.addEventListener('input', () => this.setDirty(this.area.value !== this.saved));
    this.ruler = el('div', { class: 'te-ruler', 'data-drag': '' }, el('div', { class: 'te-ruler-scale' }));
    const page = el('div', { class: 'te-page' }, this.area);
    this.el = el('div', { class: 'doc te' }, this.ruler, page);
    if (/\.md$/i.test(file.name)) {
      this.rendered = el('div', { class: 'te-md' });
      page.prepend(this.rendered);
      const tab = (label: string, md: boolean) => el('button', { class: 'te-tab', type: 'button', text: label, onclick: () => this.showMarkdown(md) });
      this.tabs = [tab('Rendered', false), tab('Markdown', true)];
      this.el.prepend(el('div', { class: 'te-mdbar', 'data-drag': '' }, ...this.tabs));
      this.ruler.classList.add('off');
      this.showMarkdown(false);
    }
  }

  /** The Rendered / Markdown switch of a `.md` file. */
  private showMarkdown(source: boolean) {
    if (!this.rendered) return;
    if (!source) this.rendered.innerHTML = renderMarkdown(this.area.value);
    this.rendered.hidden = source;
    this.area.hidden = !source;
    this.tabs.forEach((t, i) => t.classList.toggle('on', (i === 1) === source));
    if (source) this.area.focus();
  }

  save() {
    saveDoc(this.file, this.area.value);
    this.saved = this.area.value;
    this.setDirty(false);
  }

  /** File > Revert to Saved. */
  revert() {
    this.area.value = this.saved;
    if (this.rendered && !this.rendered.hidden) this.rendered.innerHTML = renderMarkdown(this.saved);
    this.setDirty(false);
  }

  /** Format > Show/Hide Ruler (⌘R). */
  toggleRuler() {
    this.ruler.classList.toggle('off');
  }

  get rulerShown() {
    return !this.ruler.classList.contains('off');
  }

  focus() {
    if (this.rendered && !this.rendered.hidden) return;
    this.area.focus();
  }

  private setDirty(d: boolean) {
    if (d === this.dirty) return;
    this.dirty = d;
    this.onDirty(d);
  }
}

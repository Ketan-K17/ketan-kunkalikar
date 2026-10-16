import type { DesktopFile } from '../desktop';
import { el } from '../dom';
import { docText, saveDoc } from '../fs';

/**
 * A TextEdit document in plain-text mode (Monaco, like the real one): editable, with a ruler. ⌘S keeps the text in
 * localStorage (see fs.ts), so the owner can actually write in the files on the laptop. Unsaved changes put a dot
 * in the window's close button, and closing asks first (MacScreen shows the sheet).
 */
export class TextDoc {
  readonly el: HTMLElement;
  readonly area: HTMLTextAreaElement;
  private ruler: HTMLElement;
  private saved: string;
  dirty = false;

  constructor(readonly file: DesktopFile, private onDirty: (dirty: boolean) => void) {
    this.saved = docText(file);
    this.area = el('textarea', { class: 'te-area', spellcheck: 'false', 'aria-label': file.name });
    this.area.value = this.saved;
    this.area.addEventListener('input', () => this.setDirty(this.area.value !== this.saved));
    this.ruler = el('div', { class: 'te-ruler', 'data-drag': '' }, el('div', { class: 'te-ruler-scale' }));
    this.el = el('div', { class: 'doc te' }, this.ruler, el('div', { class: 'te-page' }, this.area));
  }

  save() {
    saveDoc(this.file, this.area.value);
    this.saved = this.area.value;
    this.setDirty(false);
  }

  /** File > Revert to Saved. */
  revert() {
    this.area.value = this.saved;
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
    this.area.focus();
  }

  private setDirty(d: boolean) {
    if (d === this.dirty) return;
    this.dirty = d;
    this.onDirty(d);
  }
}

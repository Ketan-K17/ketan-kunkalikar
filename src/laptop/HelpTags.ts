import { el } from './dom';

const DELAY = 900;

/**
 * Help tags: the pale yellow tooltips of Aqua. Any element inside `root` with `data-tip="…"` shows one after the
 * pointer rests on it for a moment. Mouse only; a touch screen has nothing to rest on.
 */
export function helpTags(root: HTMLElement) {
  const tag = el('div', { class: 'mac-tip' });
  root.append(tag);
  let timer = 0;
  let target: HTMLElement | null = null;
  const hide = () => {
    clearTimeout(timer);
    target = null;
    tag.classList.remove('on');
  };
  root.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = (e.target as Element).closest<HTMLElement>('[data-tip]');
    if (t === target) return;
    hide();
    if (!t) return;
    target = t;
    const x = e.clientX, y = e.clientY;
    timer = window.setTimeout(() => {
      tag.textContent = t.dataset.tip ?? '';
      tag.style.left = `${Math.min(x + 4, window.innerWidth - 220)}px`;
      tag.style.top = `${y + 20}px`;
      tag.classList.add('on');
    }, DELAY);
  });
  root.addEventListener('pointerdown', hide, true);
  root.addEventListener('pointerleave', hide);
}

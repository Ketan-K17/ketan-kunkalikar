type Child = Node | string | null | undefined | false;
type Props = { class?: string; html?: string; text?: string; style?: string; [attr: string]: unknown };

/** Tiny element builder: `el('div', { class: 'x', onclick: fn }, child, 'text')`. Props starting with `on` become listeners. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v as EventListener);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

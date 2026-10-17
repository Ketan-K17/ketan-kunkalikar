/**
 * A small Markdown renderer for TextEdit's `.md` files: headings, paragraphs, bold / italic / strikethrough, inline code,
 * fenced code, block quotes, bullet and numbered lists (nested by indent), rules and links. Everything is escaped first,
 * so a file the visitor edits can't inject markup. No dependency, to keep the Mac framework-free.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(src: string): string {
  const codes: string[] = [];
  let s = esc(src).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`);
  s = s
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) =>
      /^(https?:|mailto:)/i.test(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : m,
    )
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\s][^_]*)_(?![_\w])/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/** Items of a list starting at `i`, with deeper-indented lines nested under the item above. Returns the HTML and the next line. */
function list(lines: string[], i: number): [string, number] {
  const base = LIST.exec(lines[i])![1].length;
  const ordered = /\d/.test(LIST.exec(lines[i])![2]);
  let html = '';
  while (i < lines.length) {
    const m = LIST.exec(lines[i]);
    if (!m || m[1].length < base) break;
    if (m[1].length > base) {
      const [sub, next] = list(lines, i);
      html = html.replace(/<\/li>$/, `${sub}</li>`);
      i = next;
      continue;
    }
    html += `<li>${inline(m[3])}</li>`;
    i++;
  }
  const tag = ordered ? 'ol' : 'ul';
  return [`<${tag}>${html}</${tag}>`, i];
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let out = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m: RegExpExecArray | null;
    if (!line.trim()) {
      i++;
    } else if ((m = /^(```|~~~)/.exec(line))) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith(m[1]); i++) body.push(lines[i]);
      i++;
      out += `<pre><code>${esc(body.join('\n'))}</code></pre>`;
    } else if ((m = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line))) {
      out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
      i++;
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out += '<hr>';
      i++;
    } else if (/^>/.test(line)) {
      const body: string[] = [];
      for (; i < lines.length && /^>/.test(lines[i]); i++) body.push(lines[i].replace(/^>\s?/, ''));
      out += `<blockquote>${renderMarkdown(body.join('\n'))}</blockquote>`;
    } else if (LIST.test(line)) {
      const [html, next] = list(lines, i);
      out += html;
      i = next;
    } else {
      const body: string[] = [];
      for (; i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|~~~|>)/.test(lines[i]) && !LIST.test(lines[i]); i++) body.push(lines[i].trim());
      out += `<p>${inline(body.join(' '))}</p>`;
    }
  }
  return out;
}

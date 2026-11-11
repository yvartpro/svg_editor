// Pure-ish helpers: numbers, colors, coordinates, element paths.
import { state } from './state.js';

export const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
export const fmt = v => String(Math.round(v * 100) / 100);
export const tagOf = el => el ? el.tagName.toLowerCase() : '';
export const inDefs = el => !!(el && el.closest && el.closest('defs'));

// Any CSS color → '#rrggbb', or null for none/url()/invalid.
const ctx2d = document.createElement('canvas').getContext('2d');
export function hexOf(v) {
  if (!v) return null;
  v = String(v).trim();
  if (!v || /^(none|transparent|inherit|currentcolor)$/i.test(v) || v.startsWith('url')) return null;
  ctx2d.fillStyle = '#010203'; ctx2d.fillStyle = v;
  const out = ctx2d.fillStyle;
  if (out === '#010203' && v.toLowerCase() !== '#010203') return null;
  if (out.startsWith('#')) return out.toLowerCase();
  const m = out.match(/\d+(\.\d+)?/g); if (!m) return null;
  return '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join('');
}

// Screen point → user units of `node`.
export function toLocal(cx, cy, node) {
  const m = node.getScreenCTM ? node.getScreenCTM() : null;
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

// Child-index path from the root, so a selection survives undo/redo reloads.
export function pathOf(el) {
  const root = state.root;
  if (!el || !root || !root.contains(el)) return null;
  const p = []; let n = el;
  while (n && n !== root) { p.unshift([...n.parentNode.children].indexOf(n)); n = n.parentNode; }
  return p;
}
export function byPath(p) {
  if (!p || !state.root) return null;
  let n = state.root;
  for (const i of p) { n = n.children[i]; if (!n) return null; }
  return n;
}

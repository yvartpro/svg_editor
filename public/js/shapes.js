// Creating new shapes and text with the drawing tools.
import { state } from './state.js';
import { $, SVGNS } from './dom.js';
import { fmt, tagOf, hexOf } from './util.js';
import { viewBoxRect } from './svgdoc.js';
import { commit } from './history.js';
import { renderProps } from './panel.js';
import { setTool } from './selection.js';

export function currentFill() {
  const sel = state.sel;
  return (sel && hexOf(sel.getAttribute('fill'))) ? sel.getAttribute('fill') : '#07150D';
}

export function mk(t, a) {
  const e = document.createElementNS(SVGNS, t);
  for (const k in a) e.setAttribute(k, a[k]);
  return e;
}

function starPoints(cx, cy, rx, ry) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? 0.42 : 1;
    pts.push(fmt(cx + rx * k * Math.cos(a)) + ',' + fmt(cy + ry * k * Math.sin(a)));
  }
  return pts.join(' ');
}

// Fit shape `el` of kind `kind` into the box spanned by points a and b.
export function shapeFromBox(kind, el, a, b, square) {
  let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), hh = Math.abs(b.y - a.y);
  if (square && kind !== 'line') { const m = Math.max(w, hh); if (b.x < a.x) x = a.x - m; if (b.y < a.y) y = a.y - m; w = hh = m; }
  if (kind === 'rect') { el.setAttribute('x', fmt(x)); el.setAttribute('y', fmt(y)); el.setAttribute('width', fmt(w)); el.setAttribute('height', fmt(hh)); }
  else if (kind === 'ellipse') {
    el.setAttribute('cx', fmt(x + w / 2)); el.setAttribute('cy', fmt(y + hh / 2));
    el.setAttribute('rx', fmt(w / 2)); el.setAttribute('ry', fmt(hh / 2));
  }
  else if (kind === 'line') { el.setAttribute('x1', fmt(a.x)); el.setAttribute('y1', fmt(a.y)); el.setAttribute('x2', fmt(b.x)); el.setAttribute('y2', fmt(b.y)); }
  else if (kind === 'triangle') el.setAttribute('points', `${fmt(x + w / 2)},${fmt(y)} ${fmt(x + w)},${fmt(y + hh)} ${fmt(x)},${fmt(y + hh)}`);
  else if (kind === 'star') el.setAttribute('points', starPoints(x + w / 2, y + hh / 2, w / 2, hh / 2));
}

export function newShapeEl(kind, fill) {
  if (kind === 'rect') return mk('rect', { x: 0, y: 0, width: 0, height: 0, fill });
  if (kind === 'ellipse') return mk('ellipse', { cx: 0, cy: 0, rx: 0, ry: 0, fill });
  if (kind === 'line') return mk('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: fill, 'stroke-width': '4', 'stroke-linecap': 'round' });
  if (kind === 'triangle' || kind === 'star') return mk('polygon', { points: '', fill });
  return null;
}

// New elements go into the selected group, or the root.
export function drawingParent() {
  return state.sel && tagOf(state.sel) === 'g' ? state.sel : state.root;
}

export function appendToDoc(el) {
  const parent = drawingParent();
  parent.appendChild(document.createTextNode('\n  '));
  parent.appendChild(el);
  return parent;
}

export function placeText(p) {
  const vb = viewBoxRect();
  const s = Math.max(8, Math.min(vb.w, vb.h) / 10);
  const el = mk('text', { x: fmt(p.x), y: fmt(p.y), 'font-family': 'Plus Jakarta Sans, sans-serif', 'font-size': fmt(s), 'font-weight': '700', fill: currentFill() });
  el.textContent = 'Text';
  appendToDoc(el);
  state.sel = el; commit(); renderProps(); setTool('select');
  setTimeout(() => { const f = $('#f-content'); if (f) { f.focus(); f.select(); } }, 0);
}

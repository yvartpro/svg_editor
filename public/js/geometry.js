// Moving, resizing, centering and rotating elements.
import { state } from './state.js';
import { num, fmt, tagOf, toLocal } from './util.js';
import { commit } from './history.js';

const XY_TAGS = ['rect', 'image', 'use', 'text', 'foreignobject'];

// Snapshot of the attributes a drag/resize may change.
export function snapGeom(el) {
  const o = {};
  ['x', 'y', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'r', 'rx', 'ry', 'transform'].forEach(a => o[a] = el.getAttribute(a));
  return o;
}

// Move by (dx, dy) from snapshot `o`: edit x/y-style attributes when the
// element has them, otherwise prepend/adjust a translate().
export function moveEl(el, o, dx, dy, snapInt) {
  const t = tagOf(el);
  const hasT = o.transform && o.transform.trim();
  const fx = v => snapInt ? String(Math.round(v)) : fmt(v);
  const textOnPath = t === 'text' && el.querySelector('textPath');
  if (!hasT && XY_TAGS.includes(t) && !textOnPath) {
    el.setAttribute('x', fx(num(o.x) + dx)); el.setAttribute('y', fx(num(o.y) + dy));
  } else if (!hasT && (t === 'circle' || t === 'ellipse')) {
    el.setAttribute('cx', fx(num(o.cx) + dx)); el.setAttribute('cy', fx(num(o.cy) + dy));
  } else if (!hasT && t === 'line') {
    el.setAttribute('x1', fx(num(o.x1) + dx)); el.setAttribute('y1', fx(num(o.y1) + dy));
    el.setAttribute('x2', fx(num(o.x2) + dx)); el.setAttribute('y2', fx(num(o.y2) + dy));
  } else {
    let rest = hasT ? o.transform.trim() : '', bx = 0, by = 0;
    const m = rest.match(/^translate\(\s*([-+\d.eE]+)(?:[\s,]+([-+\d.eE]+))?\s*\)\s*/);
    if (m) { bx = num(m[1]); by = num(m[2]); rest = rest.slice(m[0].length); }
    const tr = `translate(${fx(bx + dx)} ${fx(by + dy)})`;
    el.setAttribute('transform', rest ? tr + ' ' + rest : tr);
  }
}

export function canResize(el) {
  if (el.getAttribute('transform')) return false;
  return ['rect', 'image', 'foreignobject', 'circle', 'ellipse', 'line'].includes(tagOf(el));
}

// Resize so the bottom-right handle (or line end) sits at point p.
export function resizeTo(el, o, p, keepRatio, snapInt) {
  const t = tagOf(el), fx = v => snapInt ? String(Math.round(v)) : fmt(v);
  if (t === 'circle') el.setAttribute('r', fx(Math.max(0.5, Math.max(Math.abs(p.x - num(o.cx)), Math.abs(p.y - num(o.cy))))));
  else if (t === 'ellipse') {
    let rx = Math.max(0.5, Math.abs(p.x - num(o.cx))), ry = Math.max(0.5, Math.abs(p.y - num(o.cy)));
    if (keepRatio && num(o.rx)) ry = num(o.ry) * rx / num(o.rx);
    el.setAttribute('rx', fx(rx)); el.setAttribute('ry', fx(ry));
  } else if (t === 'line') { el.setAttribute('x2', fx(p.x)); el.setAttribute('y2', fx(p.y)); }
  else {
    let w = Math.max(0.5, p.x - num(o.x)), hh = Math.max(0.5, p.y - num(o.y));
    if (keepRatio && num(o.width) && num(o.height)) hh = w * num(o.height) / num(o.width);
    el.setAttribute('width', fx(w)); el.setAttribute('height', fx(hh));
  }
}

// axis: 'h', 'v', or anything else for both.
export function centerOn(axis) {
  const { sel, root } = state;
  if (!sel) return;
  const r = sel.getBoundingClientRect(), R = root.getBoundingClientRect();
  const dxs = axis !== 'v' ? (R.left + R.width / 2) - (r.left + r.width / 2) : 0;
  const dys = axis !== 'h' ? (R.top + R.height / 2) - (r.top + r.height / 2) : 0;
  const a = toLocal(0, 0, sel.parentNode), b = toLocal(dxs, dys, sel.parentNode);
  moveEl(sel, snapGeom(sel), b.x - a.x, b.y - a.y);
  commit();
}

export function getRotation(el) {
  const m = (el.getAttribute('transform') || '').match(/rotate\(\s*([-+\d.eE]+)/);
  return m ? num(m[1]) : 0;
}

export function setRotation(el, deg) {
  let t = (el.getAttribute('transform') || '').replace(/\s*rotate\([^)]*\)\s*/g, ' ').trim();
  if (deg) {
    let bb; try { bb = el.getBBox(); } catch (e) { bb = { x: 0, y: 0, width: 0, height: 0 }; }
    t = (t ? t + ' ' : '') + `rotate(${fmt(deg)} ${fmt(bb.x + bb.width / 2)} ${fmt(bb.y + bb.height / 2)})`;
  }
  if (t) el.setAttribute('transform', t); else el.removeAttribute('transform');
}

// The Design tab: fields for the selected element (or the canvas).
import { state } from './state.js';
import { h, icon, say, propsEl } from './dom.js';
import { num, fmt, tagOf, hexOf } from './util.js';
import { sizeArt } from './svgdoc.js';
import { commit } from './history.js';
import { drawOverlay } from './overlay.js';
import { updateStatus } from './render.js';
import { select } from './selection.js';
import { labelFor, buildLayers } from './layers.js';
import { centerOn, getRotation, setRotation } from './geometry.js';
import { duplicate, del, forward, backward, group, ungroup } from './structure.js';

const GEOM = {
  svg: ['width', 'height'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  text: ['x', 'y'],
  image: ['x', 'y', 'width', 'height'],
  use: ['x', 'y', 'width', 'height'],
  foreignobject: ['x', 'y', 'width', 'height'],
};
const SHORT = { x: 'X', y: 'Y', cx: 'X', cy: 'Y', x1: 'X1', y1: 'Y1', x2: 'X2', y2: 'Y2', width: 'W', height: 'H', r: 'R', rx: 'RX', ry: 'RY' };
const TEXTY = { path: ['d'], polygon: ['points'], polyline: ['points'], image: ['href'], use: ['href'], svg: ['viewBox'] };
const SELECTS = {
  'font-weight': ['', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'],
  'text-anchor': ['', 'start', 'middle', 'end'],
  'dominant-baseline': ['', 'auto', 'middle', 'central', 'hanging', 'alphabetic'],
  'stroke-linecap': ['', 'butt', 'round', 'square'],
  'stroke-linejoin': ['', 'miter', 'round', 'bevel'],
  'fill-rule': ['', 'nonzero', 'evenodd'],
};
const NICE = {
  'font-family': 'Font', 'font-size': 'Size', 'font-weight': 'Weight', 'letter-spacing': 'Tracking', 'text-anchor': 'Align', 'dominant-baseline': 'Baseline',
  fill: 'Fill', stroke: 'Stroke', 'stroke-width': 'Width', opacity: 'Opacity', 'fill-opacity': 'Fill alpha', 'stroke-opacity': 'Stroke alpha',
  'stroke-linecap': 'Caps', 'stroke-linejoin': 'Joins', 'fill-rule': 'Fill rule', transform: 'Transform', d: 'Path', points: 'Points', href: 'Link', viewBox: 'viewBox', startOffset: 'On path',
};

/* ---------- field builders ---------- */

// Apply a value while typing; commit() on change records it in history.
function liveSet(el, attr, v) {
  if (v === '' || v == null) el.removeAttribute(attr); else el.setAttribute(attr, v);
  if (el === state.root && /^(width|height|viewBox)$/i.test(attr)) sizeArt();
  drawOverlay(); updateStatus();
}

// Drag a label left/right to change its number.
function attachScrub(lab, inp, attr, apply) {
  lab.addEventListener('pointerdown', e => {
    e.preventDefault();
    const sx = e.clientX, start = num(inp.value), unit = (inp.value.match(/[a-z%]+$/i) || [''])[0];
    const small = /opacity/.test(attr);
    lab.setPointerCapture(e.pointerId);
    const mv = ev => {
      const step = small ? 0.01 : (ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1);
      let v = start + Math.round((ev.clientX - sx) / 3) * step;
      if (small) v = Math.max(0, Math.min(1, v));
      if (/^(r|rx|ry|width|height|font-size|stroke-width)$/.test(attr)) v = Math.max(0, v);
      inp.value = fmt(v) + unit; apply(inp.value);
    };
    const up = () => { lab.removeEventListener('pointermove', mv); lab.removeEventListener('pointerup', up); commit(); };
    lab.addEventListener('pointermove', mv); lab.addEventListener('pointerup', up);
  });
}

function numInput(el, attr) {
  const inp = h('input', { type: 'text', value: el.getAttribute(attr) ?? '', 'data-attr': attr, id: 'f-' + attr, inputmode: 'decimal', placeholder: '–', spellcheck: 'false' });
  inp.addEventListener('input', () => liveSet(el, attr, inp.value.trim()));
  inp.addEventListener('change', commit);
  inp.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const step = (/opacity/.test(attr) ? 0.05 : e.shiftKey ? 10 : e.altKey ? 0.1 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
    const unit = (inp.value.match(/[a-z%]+$/i) || [''])[0];
    inp.value = fmt(num(inp.value) + step) + unit; liveSet(el, attr, inp.value); commit();
  });
  return inp;
}

// Label inside the field, like X / Y / W / H.
function compactNum(el, attr) {
  const inp = numInput(el, attr);
  const lab = h('label', { for: 'f-' + attr, title: attr + ' — drag to change' }, SHORT[attr] || attr);
  attachScrub(lab, inp, attr, v => liveSet(el, attr, v));
  return h('div', { class: 'nf' }, lab, inp);
}

function numRow(el, attr) {
  const inp = numInput(el, attr);
  const lab = h('label', { for: 'f-' + attr, class: 'scrub', title: attr + ' — drag to change' }, NICE[attr] || attr);
  attachScrub(lab, inp, attr, v => liveSet(el, attr, v));
  return h('div', { class: 'row' }, lab, inp);
}

function textRow(el, attr, multiline) {
  const id = 'f-' + attr;
  const inp = multiline ? h('textarea', { rows: '3', 'data-attr': attr, id, spellcheck: 'false' }) : h('input', { type: 'text', 'data-attr': attr, id, spellcheck: 'false' });
  inp.value = el.getAttribute(attr) ?? (attr === 'href' ? (el.getAttribute('xlink:href') ?? '') : '');
  inp.addEventListener('input', () => liveSet(el, attr, inp.value));
  inp.addEventListener('change', commit);
  return h('div', { class: 'row' }, h('label', { for: id, title: attr }, NICE[attr] || attr), inp);
}

function selectRow(el, attr) {
  const id = 'f-' + attr, cur = el.getAttribute(attr) ?? '';
  const opts = SELECTS[attr].includes(cur) ? SELECTS[attr] : [...SELECTS[attr], cur];
  const s = h('select', { id }, opts.map(o => h('option', { value: o, selected: o === cur }, o || 'inherit')));
  s.addEventListener('change', () => { liveSet(el, attr, s.value); commit(); });
  return h('div', { class: 'row' }, h('label', { for: id, title: attr }, NICE[attr] || attr), s);
}

function colorRow(el, attr) {
  const id = 'f-' + attr, raw = el.getAttribute(attr);
  let computed = '';
  try { computed = getComputedStyle(el)[attr]; } catch (e) {}
  const hx = hexOf(raw) || hexOf(computed) || '#000000';
  const pick = h('input', { type: 'color', value: hx, 'aria-label': (NICE[attr] || attr) + ' color' });
  const ph = computed && computed !== 'none' && hexOf(computed) ? 'inherits ' + hexOf(computed).toUpperCase() : 'none';
  const txt = h('input', { type: 'text', id, 'data-attr': attr, value: raw ?? '', placeholder: ph, spellcheck: 'false' });
  const none = h('button', { class: 'ab', title: 'No ' + attr, 'aria-label': 'Set ' + attr + ' to none', type: 'button' }, icon('none'));
  pick.addEventListener('input', () => { txt.value = pick.value.toUpperCase(); liveSet(el, attr, txt.value); });
  pick.addEventListener('change', commit);
  txt.addEventListener('input', () => { liveSet(el, attr, txt.value.trim()); const x = hexOf(txt.value); if (x) pick.value = x; });
  txt.addEventListener('change', commit);
  none.addEventListener('click', () => { txt.value = 'none'; liveSet(el, attr, 'none'); commit(); });
  return h('div', { class: 'row' }, h('label', { for: id }, NICE[attr]), h('div', { class: 'cc' }, pick, txt, none));
}

function textContentRow(el) {
  const target = el.querySelector('textPath') || el;
  const ta = h('textarea', { rows: '2', id: 'f-content' });
  ta.value = target.textContent.trim();
  ta.addEventListener('input', () => { target.textContent = ta.value; drawOverlay(); buildLayers(); });
  ta.addEventListener('change', commit);
  return h('div', { class: 'row' }, h('label', { for: 'f-content' }, 'Content'), ta);
}

function rotateRow(el) {
  const rot = h('input', { type: 'text', id: 'f-rot', value: fmt(getRotation(el)), inputmode: 'decimal', spellcheck: 'false' });
  const rotLab = h('label', { for: 'f-rot', class: 'scrub', title: 'Drag to rotate, Shift = 15° steps' }, 'Rotate °');
  const apply = () => { setRotation(el, num(rot.value)); drawOverlay(); syncField('transform'); };
  rot.addEventListener('input', apply);
  rot.addEventListener('change', commit);
  rotLab.addEventListener('pointerdown', e => {
    e.preventDefault(); const sx = e.clientX, start = num(rot.value); rotLab.setPointerCapture(e.pointerId);
    const mv = ev => { rot.value = fmt(start + Math.round((ev.clientX - sx) / 2) * (ev.shiftKey ? 15 : 1)); apply(); };
    const up = () => { rotLab.removeEventListener('pointermove', mv); rotLab.removeEventListener('pointerup', up); commit(); };
    rotLab.addEventListener('pointermove', mv); rotLab.addEventListener('pointerup', up);
  });
  return h('div', { class: 'row' }, rotLab, rot);
}

// Every attribute not shown above, editable, plus a row to add one.
function moreAttributes(el, shown) {
  const rows = [...el.attributes].filter(a => !shown.has(a.name)).map(a => {
    const inp = h('input', { type: 'text', value: a.value, 'data-attr': a.name, 'aria-label': a.name, spellcheck: 'false' });
    inp.addEventListener('input', () => liveSet(el, a.name, inp.value));
    inp.addEventListener('change', commit);
    const x = h('button', { class: 'x', title: 'Remove ' + a.name, 'aria-label': 'Remove ' + a.name, type: 'button' }, icon('x'));
    x.addEventListener('click', () => { el.removeAttribute(a.name); commit(); renderProps(); });
    return h('div', { class: 'arow' }, h('span', { class: 'k', title: a.name }, a.name), inp, x);
  });
  if (el.getAttribute('style') !== null) {
    const inp = h('input', { type: 'text', value: el.getAttribute('style'), 'data-attr': 'style', 'aria-label': 'style', spellcheck: 'false' });
    inp.addEventListener('input', () => liveSet(el, 'style', inp.value)); inp.addEventListener('change', commit);
    rows.unshift(h('div', { class: 'arow' }, h('span', { class: 'k' }, 'style'), inp, h('span')));
  }
  const k = h('input', { type: 'text', placeholder: 'name', 'aria-label': 'New attribute name', spellcheck: 'false' });
  const v = h('input', { type: 'text', placeholder: 'value', 'aria-label': 'New attribute value', spellcheck: 'false' });
  const add = h('button', { class: 'x add', title: 'Add attribute', 'aria-label': 'Add attribute', type: 'button' }, icon('plus'));
  const doAdd = () => {
    const name = k.value.trim();
    if (!name || /^on/i.test(name)) return;
    try { el.setAttribute(name, v.value); } catch (e) { say('Not a valid attribute name'); return; }
    commit(); renderProps();
  };
  add.addEventListener('click', doAdd);
  v.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  return sec('More attributes', rows, h('div', { class: 'arow' }, k, v, add));
}

function sec(title, ...rows) {
  return h('div', { class: 'sec' }, h('div', { class: 'head' }, title), ...rows.flat().filter(Boolean));
}

function pairs(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i += 2) out.push(h('div', { class: 'pair' }, nodes[i], nodes[i + 1] || h('span')));
  return out;
}

function ab(name, label, fn, extra = '') {
  return h('button', { class: 'ab ' + extra, title: label, 'aria-label': label, onclick: fn, type: 'button' }, icon(name));
}

/* ---------- panel ---------- */

export function renderProps() {
  propsEl.replaceChildren();
  if (!state.root) return;
  const sel = state.sel, el = sel || state.root, t = tagOf(el);
  const shown = new Set(['id', 'xmlns', 'xmlns:xlink', 'style']);
  const mark = a => (shown.add(a), a);

  const title = sel ? (labelFor(sel) === t ? t[0].toUpperCase() + t.slice(1) : labelFor(sel)) : 'Canvas';
  propsEl.append(h('div', { class: 'selhead' }, h('b', {}, title), h('span', {}, sel ? '<' + t + '>' : '')));

  if (!sel) {
    propsEl.append(h('div', { class: 'empty' }, 'Nothing selected. Click any part of the drawing, or pick a tool on the left to draw.'));
  } else {
    propsEl.append(h('div', { class: 'acts' },
      ab('ch', 'Center horizontally', () => centerOn('h')),
      ab('cv', 'Center vertically', () => centerOn('v')),
      ab('up', 'Bring forward  ]', forward),
      ab('dn', 'Send backward  [', backward),
      ab('dup', 'Duplicate  Ctrl D', duplicate),
      ab('group', 'Group  Ctrl G', group),
      t === 'g' ? h('button', { class: 'ab txt', onclick: ungroup, type: 'button', title: 'Ctrl Shift G' }, 'Ungroup') : null,
      el.parentNode !== state.root ? ab('parent', 'Select parent group', () => select(el.parentNode)) : null,
      ab('trash', 'Delete  Del', del, 'danger')));
  }

  const geom = (GEOM[t] || []).map(a => { mark(a); return compactNum(el, a); });
  const texty = (TEXTY[t] || []).map(a => { mark(a); return textRow(el, a, a === 'd' || a === 'points'); });
  const idInp = h('input', { type: 'text', id: 'f-id', value: el.id || '', placeholder: 'none', spellcheck: 'false' });
  idInp.addEventListener('change', () => { liveSet(el, 'id', idInp.value.trim()); commit(); buildLayers(); });
  propsEl.append(sec(sel ? 'Layout' : 'Size', pairs(geom), texty, h('div', { class: 'row' }, h('label', { for: 'f-id' }, 'Name (id)'), idInp)));

  if (t === 'text') {
    const tp = el.querySelector('textPath');
    const rows = [textContentRow(el), textRow(el, mark('font-family')), numRow(el, mark('font-size')), selectRow(el, mark('font-weight')), numRow(el, mark('letter-spacing'))];
    ['text-anchor', 'dominant-baseline'].forEach(a => { mark(a); rows.push(selectRow(tp && tp.hasAttribute(a) ? tp : el, a)); });
    if (tp) rows.push(numRow(tp, 'startOffset'));
    propsEl.append(sec('Type', rows));
  }

  if (t !== 'svg' && t !== 'defs') {
    const fillSec = [colorRow(el, mark('fill')), numRow(el, mark('opacity'))];
    if (el.hasAttribute('fill-opacity')) fillSec.push(numRow(el, mark('fill-opacity')));
    propsEl.append(sec('Fill', fillSec));

    const strokeSec = [colorRow(el, mark('stroke')), numRow(el, mark('stroke-width')), selectRow(el, mark('stroke-linecap')), selectRow(el, mark('stroke-linejoin'))];
    if (el.hasAttribute('stroke-opacity')) strokeSec.push(numRow(el, mark('stroke-opacity')));
    propsEl.append(sec('Stroke', strokeSec));

    mark('transform');
    propsEl.append(sec('Transform', rotateRow(el), textRow(el, 'transform')));
  }

  propsEl.append(moreAttributes(el, shown));
}

function syncField(attr) {
  const f = propsEl.querySelector(`[data-attr="${attr}"]`);
  if (f && document.activeElement !== f && state.sel) f.value = state.sel.getAttribute(attr) ?? '';
}

// Update field values in place (during drags) without rebuilding the panel.
export function refreshValues() {
  const el = state.sel || state.root; if (!el) return;
  propsEl.querySelectorAll('[data-attr]').forEach(f => {
    if (document.activeElement === f) return;
    f.value = el.getAttribute(f.dataset.attr) ?? '';
  });
  const rot = propsEl.querySelector('#f-rot');
  if (rot && document.activeElement !== rot) rot.value = fmt(getRotation(el));
  updateStatus();
}

// The Layers tree in the left sidebar.
import { state } from './state.js';
import { h, icon, layersEl } from './dom.js';
import { tagOf, hexOf } from './util.js';
import { commit } from './history.js';
import { select } from './selection.js';
import { drawOverlay } from './overlay.js';

const LAYER_ICON = { rect: 'rect', circle: 'ellipse', ellipse: 'ellipse', line: 'line', polygon: 'tri', polyline: 'path', path: 'path', text: 'text', g: 'g', a: 'g', defs: 'defs', image: 'img', use: 'dup' };

export function labelFor(el) {
  const t = tagOf(el);
  if (el.id) return el.id;
  if (t === 'text') return (el.textContent || '').trim().slice(0, 28) || 'text';
  if (t === 'defs') return 'definitions';
  if (t === 'g') return 'group';
  return t;
}

function toggleHidden(el, hidden) {
  if (hidden) { el.removeAttribute('display'); if (el.getAttribute('visibility') === 'hidden') el.removeAttribute('visibility'); }
  else el.setAttribute('display', 'none');
  commit();
}

function layerRow(el, depth) {
  const t = tagOf(el);
  const hidden = el.getAttribute('display') === 'none' || el.getAttribute('visibility') === 'hidden';
  const fill = hexOf(el.getAttribute('fill')) || hexOf(el.getAttribute('stroke'));
  const eye = t === 'defs' ? null : h('span', { class: 'eye' + (hidden ? ' off' : ''), role: 'button', tabindex: '0', title: hidden ? 'Show' : 'Hide', 'aria-label': hidden ? 'Show layer' : 'Hide layer' }, icon(hidden ? 'eyeoff' : 'eye'));
  const row = h('button', { class: 'lrow' + (el === state.sel ? ' sel' : '') + (hidden || t === 'defs' ? ' dim' : ''), style: `padding-left:${6 + depth * 14}px` },
    h('span', { class: 'ic' }, icon(LAYER_ICON[t] || 'path')),
    h('span', { class: 'nm' }, labelFor(el)),
    fill ? h('span', { class: 'chipdot', style: `background:${fill}` }) : null,
    eye);
  row.addEventListener('click', ev => {
    if (eye && eye.contains(ev.target)) { toggleHidden(el, hidden); return; }
    if (t !== 'defs') select(el);
  });
  row.addEventListener('mouseenter', () => { state.hover = el; drawOverlay(); });
  row.addEventListener('mouseleave', () => { state.hover = null; drawOverlay(); });
  return row;
}

export function buildLayers() {
  layersEl.replaceChildren();
  if (!state.root) return;
  // Front-most first, like design tools do.
  const walk = (parent, depth) => {
    [...parent.children].reverse().forEach(el => {
      const t = tagOf(el);
      if (/^(title|desc|metadata|style)$/.test(t)) return;
      layersEl.append(layerRow(el, depth));
      if ((t === 'g' || t === 'a' || t === 'svg') && el.children.length) walk(el, depth + 1);
    });
  };
  walk(state.root, 0);
  const s = layersEl.querySelector('.lrow.sel');
  if (s) s.scrollIntoView({ block: 'nearest' });
}

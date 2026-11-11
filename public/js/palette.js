// "Colors in this file": swatches, apply to selection, replace everywhere.
import { state } from './state.js';
import { h, icon, say, swatchesEl } from './dom.js';
import { hexOf } from './util.js';
import { commit } from './history.js';
import { renderProps, refreshValues } from './panel.js';
import { drawOverlay } from './overlay.js';

const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'];

// cb(el, 'attr' | 'style', name, hex) for every color in attributes and inline styles.
function eachColor(cb) {
  const root = state.root;
  [root, ...root.querySelectorAll('*')].forEach(el => {
    COLOR_ATTRS.forEach(a => { const hx = hexOf(el.getAttribute(a)); if (hx) cb(el, 'attr', a, hx); });
    const st = el.getAttribute('style');
    if (st) st.split(';').forEach(d => {
      const [k, v] = d.split(':').map(s => s && s.trim());
      if (k && COLOR_ATTRS.includes(k.toLowerCase())) { const hx = hexOf(v); if (hx) cb(el, 'style', k, hx); }
    });
  });
}

function replaceColor(oldHx, newHx) {
  const nv = newHx.toUpperCase();
  eachColor((el, kind, a, hx) => {
    if (hx !== oldHx.toLowerCase()) return;
    if (kind === 'attr') { el.setAttribute(a, nv); return; }
    const st = el.getAttribute('style').split(';').map(d => {
      const i = d.indexOf(':'); if (i < 0) return d;
      const k = d.slice(0, i).trim();
      return k.toLowerCase() === a.toLowerCase() && hexOf(d.slice(i + 1)) === hx ? `${k}:${nv}` : d;
    }).join(';');
    el.setAttribute('style', st);
  });
}

function swatch(hx, n, id) {
  const chip = h('button', { class: 'chip', style: `background:${hx}`, title: `${hx.toUpperCase()} — used ${n}×`, 'aria-label': `Use ${hx}` });
  chip.addEventListener('click', ev => {
    if (!state.sel) { say('Select something first'); return; }
    state.sel.setAttribute(ev.shiftKey ? 'stroke' : 'fill', hx.toUpperCase()); commit(); renderProps();
  });
  const rep = h('input', { type: 'color', id, value: hx });
  const lab = h('label', { for: id, title: `Replace ${hx.toUpperCase()} everywhere` }, icon('swap'));
  rep.addEventListener('input', () => {
    replaceColor(rep.dataset.cur || hx, rep.value); rep.dataset.cur = rep.value;
    chip.style.background = rep.value; drawOverlay(); refreshValues();
  });
  rep.addEventListener('change', () => { commit(); renderProps(); });
  return h('div', { class: 'sw' }, chip, lab, rep);
}

export function buildPalette() {
  swatchesEl.replaceChildren();
  if (!state.root) return;
  const counts = new Map();
  eachColor((el, kind, a, hx) => counts.set(hx, (counts.get(hx) || 0) + 1));
  if (!counts.size) {
    swatchesEl.append(h('span', { style: 'grid-column:1/-1;color:var(--faint);font-size:12px' }, 'No colors yet.'));
    return;
  }
  [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([hx, n], i) => swatchesEl.append(swatch(hx, n, 'rep-' + i)));
}

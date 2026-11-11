// Duplicate, delete, reorder, group and ungroup.
import { state } from './state.js';
import { SVGNS } from './dom.js';
import { tagOf, inDefs } from './util.js';
import { commit } from './history.js';
import { renderProps } from './panel.js';

export function duplicate() {
  const sel = state.sel;
  if (!sel) return;
  const c = sel.cloneNode(true); c.removeAttribute('id');
  sel.parentNode.insertBefore(c, sel.nextSibling);
  state.sel = c; commit(); renderProps();
}

export function del() {
  const sel = state.sel;
  if (!sel) return;
  const next = sel.previousElementSibling || sel.nextElementSibling || (sel.parentNode !== state.root ? sel.parentNode : null);
  sel.remove(); state.sel = next && !inDefs(next) ? next : null;
  commit(); renderProps();
}

export function forward() {
  const sel = state.sel;
  if (sel && sel.nextElementSibling) { sel.parentNode.insertBefore(sel.nextElementSibling, sel); commit(); }
}

export function backward() {
  const sel = state.sel;
  if (sel && sel.previousElementSibling) { sel.parentNode.insertBefore(sel, sel.previousElementSibling); commit(); }
}

export function group() {
  const sel = state.sel;
  if (!sel) return;
  const g = document.createElementNS(SVGNS, 'g');
  sel.parentNode.insertBefore(g, sel); g.appendChild(sel);
  state.sel = g; commit(); renderProps();
}

// Push the group's transform and inheritable attributes down to its children.
export function ungroup() {
  const g = state.sel;
  if (!g || tagOf(g) !== 'g') return;
  const gT = g.getAttribute('transform'), first = g.firstElementChild;
  const inherit = [...g.attributes].filter(a => a.name !== 'id' && a.name !== 'transform');
  [...g.childNodes].forEach(ch => {
    if (ch.nodeType === 1) {
      if (gT) ch.setAttribute('transform', gT + (ch.getAttribute('transform') ? ' ' + ch.getAttribute('transform') : ''));
      inherit.forEach(a => { if (!ch.hasAttribute(a.name)) ch.setAttribute(a.name, a.value); });
    }
    g.parentNode.insertBefore(ch, g);
  });
  g.remove(); state.sel = first; commit(); renderProps();
}

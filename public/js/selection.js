// Active tool and the current selection.
import { state } from './state.js';
import { stage } from './dom.js';
import { tagOf, inDefs } from './util.js';
import { rememberSelection } from './history.js';
import { buildLayers } from './layers.js';
import { renderProps } from './panel.js';
import { drawOverlay } from './overlay.js';
import { updateStatus } from './render.js';

export function setTool(t) {
  state.tool = t; stage.dataset.tool = t;
  document.querySelectorAll('.tool').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  if (t !== 'select') { state.hover = null; drawOverlay(); }
}

// What a click on `node` should select: the smallest real element, or with
// Alt its top-level group. Never <defs>, <tspan> or <textPath>.
export function pickTarget(node, alt) {
  const root = state.root;
  if (!root || !node || node === root || !root.contains(node)) return null;
  let n = node.nodeType === 1 ? node : node.parentNode;
  if (inDefs(n)) return null;
  while (n && n !== root && /^(tspan|textpath)$/i.test(n.tagName)) n = n.parentNode;
  if (alt) {
    let top = n;
    while (top.parentNode && top.parentNode !== root) top = top.parentNode;
    if (tagOf(top) === 'g' || tagOf(top) === 'a') return top;
  }
  return n === root ? null : n;
}

export function select(el) {
  state.sel = el;
  rememberSelection();
  buildLayers(); renderProps(); drawOverlay(); updateStatus();
}

// Loading, sizing and serializing the edited SVG document.
import { state } from './state.js';
import { $, art, say } from './dom.js';
import { num } from './util.js';
import { fit } from './view.js';
import { pushHistory } from './history.js';
import { refreshAll } from './render.js';

// Strip scripts, event handlers and javascript: links from untrusted SVG.
function sanitize(node) {
  node.querySelectorAll('script').forEach(s => s.remove());
  [node, ...node.querySelectorAll('*')].forEach(el => {
    [...el.attributes].forEach(a => {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      if (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
    });
  });
}

export function loadSVG(text, { commit = true, keepView = false } = {}) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const de = doc.documentElement;
  if (doc.querySelector('parsererror') || !de || de.nodeName.toLowerCase() !== 'svg') {
    say("That doesn't look like valid SVG."); return false;
  }
  sanitize(de);
  const node = document.importNode(de, true);
  art.replaceChildren(node);
  state.root = node; state.sel = null; state.hover = null;
  sizeArt();
  if (!keepView) fit();
  if (commit) pushHistory();
  refreshAll();
  return true;
}

export const serialize = () => state.root ? new XMLSerializer().serializeToString(state.root) : '';

// Size the white artboard from width/height/viewBox, like a browser would.
export function sizeArt() {
  const root = state.root;
  const vb = root.viewBox && root.viewBox.baseVal;
  const wa = root.getAttribute('width'), ha = root.getAttribute('height');
  let w = wa && !wa.includes('%') ? num(wa) : 0;
  let hh = ha && !ha.includes('%') ? num(ha) : 0;
  const hasVb = vb && vb.width > 0 && vb.height > 0;
  if (!w && !hh) { if (hasVb) { w = vb.width; hh = vb.height; } else { w = 300; hh = 150; } }
  else if (!w) w = hasVb ? hh * vb.width / vb.height : 300;
  else if (!hh) hh = hasVb ? w * vb.height / vb.width : 150;
  state.artW = w; state.artH = hh;
  art.style.width = w + 'px'; art.style.height = hh + 'px';
}

export function viewBoxRect() {
  const vb = state.root.viewBox && state.root.viewBox.baseVal;
  if (vb && vb.width > 0) return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  return { x: 0, y: 0, w: state.artW, h: state.artH };
}

export function fileName(ext) {
  let n = ($('#fname').value || 'untitled').trim().replace(/[\\/:*?"<>|]+/g, '-');
  n = n.replace(/\.(svg|png)$/i, '') || 'untitled';
  return n + ext;
}

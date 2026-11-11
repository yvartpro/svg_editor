// Keyboard shortcuts (listed in the Keys tab).
import { state } from './state.js';
import { isEditableTarget } from './dom.js';
import { toLocal } from './util.js';
import { commit, undo, redo } from './history.js';
import { fit } from './view.js';
import { drawOverlay } from './overlay.js';
import { select, setTool } from './selection.js';
import { snapGeom, moveEl } from './geometry.js';
import { duplicate, del, forward, backward, group, ungroup } from './structure.js';
import { refreshValues } from './panel.js';

const TOOL_KEYS = { v: 'select', h: 'hand', r: 'rect', o: 'ellipse', l: 'line', y: 'triangle', s: 'star', t: 'text' };
let nudgeTimer = null;

// Arrow keys move by screen pixels; history is recorded once the keys go quiet.
function nudge(dx, dy) {
  const sel = state.sel;
  const a = toLocal(0, 0, sel.parentNode), b = toLocal(dx * state.scale, dy * state.scale, sel.parentNode);
  moveEl(sel, snapGeom(sel), b.x - a.x, b.y - a.y);
  clearTimeout(nudgeTimer); nudgeTimer = setTimeout(commit, 350);
  drawOverlay(); refreshValues();
}

function onKeyDown(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === ' ' && !isEditableTarget(e.target)) { state.spaceDown = true; e.preventDefault(); return; }
  if (isEditableTarget(e.target)) { if (e.key === 'Escape') e.target.blur(); return; }
  const k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
  if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? ungroup() : group(); return; }
  if (mod || e.altKey) return;
  if (k === 'escape') { if (state.tool !== 'select') setTool('select'); else select(null); return; }
  if (k === 'f') { fit(); return; }
  if (TOOL_KEYS[k]) { setTool(TOOL_KEYS[k]); return; }
  if (!state.sel) return;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); del(); return; }
  if (k === ']') { forward(); return; }
  if (k === '[') { backward(); return; }
  const d = e.shiftKey ? 10 : 1;
  const dirs = { arrowleft: [-d, 0], arrowright: [d, 0], arrowup: [0, -d], arrowdown: [0, d] };
  if (dirs[k]) { e.preventDefault(); nudge(...dirs[k]); }
}

export function initKeyboard() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', e => { if (e.key === ' ') state.spaceDown = false; });
  window.addEventListener('blur', () => { state.spaceDown = false; });
}

// Undo / redo. Each entry is a full serialized snapshot plus the selection path.
import { state } from './state.js';
import { $, codeEl } from './dom.js';
import { pathOf, byPath } from './util.js';
import { serialize, loadSVG } from './svgdoc.js';
import { buildLayers } from './layers.js';
import { buildPalette } from './palette.js';
import { refreshValues } from './panel.js';
import { drawOverlay } from './overlay.js';
import { updateStatus, refreshAll } from './render.js';

const LIMIT = 150;
let hist = [], redoStack = [];

export function pushHistory() {
  const s = serialize();
  const top = hist[hist.length - 1];
  if (top && top.svg === s) { top.sel = pathOf(state.sel); return; }
  hist.push({ svg: s, sel: pathOf(state.sel) });
  if (hist.length > LIMIT) hist.shift();
  redoStack = [];
  updateUndoBtns();
}

// Keep the latest snapshot's selection in sync without making a new entry.
export function rememberSelection() {
  if (hist.length) hist[hist.length - 1].sel = pathOf(state.sel);
}

// Record a finished edit and refresh everything that depends on the document.
export function commit() {
  pushHistory();
  buildLayers(); buildPalette(); refreshValues(); drawOverlay(); updateStatus();
  if (state.activeTab === 'code' && document.activeElement !== codeEl) codeEl.value = serialize();
}

function restore(snap) {
  loadSVG(snap.svg, { commit: false, keepView: true });
  state.sel = byPath(snap.sel);
  refreshAll();
}

export function undo() {
  if (hist.length < 2) return;
  redoStack.push(hist.pop()); restore(hist[hist.length - 1]); updateUndoBtns();
}
export function redo() {
  if (!redoStack.length) return;
  const s = redoStack.pop(); hist.push(s); restore(s); updateUndoBtns();
}
export function updateUndoBtns() {
  $('#bUndo').disabled = hist.length < 2;
  $('#bRedo').disabled = !redoStack.length;
}

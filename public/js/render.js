// Whole-UI refresh and the status bar.
import { state } from './state.js';
import { $, codeEl } from './dom.js';
import { fmt, tagOf } from './util.js';
import { serialize } from './svgdoc.js';
import { updateUndoBtns } from './history.js';
import { buildLayers } from './layers.js';
import { buildPalette } from './palette.js';
import { renderProps } from './panel.js';
import { drawOverlay } from './overlay.js';

export function updateStatus() {
  const { root, sel } = state;
  if (!root) return;
  let s = 'nothing selected';
  if (sel && root.contains(sel)) {
    s = '<' + tagOf(sel) + '>';
    try { const bb = sel.getBBox(); s += `  ${fmt(bb.width)} × ${fmt(bb.height)}`; } catch (e) {}
  }
  $('#ssel').textContent = s;
  $('#sdoc').textContent = `${fmt(state.artW)} × ${fmt(state.artH)} · ${root.querySelectorAll('*').length} elements`;
}

export function refreshAll() {
  const open = !!state.root;
  $('#welcome').hidden = open;
  ['#bDl', '#bPng', '#bCopy', '#bCopy2'].forEach(s => { $(s).disabled = !open; });
  buildLayers(); buildPalette(); renderProps(); drawOverlay(); updateUndoBtns(); updateStatus();
  if (state.activeTab === 'code') codeEl.value = serialize();
}

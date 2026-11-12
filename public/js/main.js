// Entry point: wires the toolbar and panels. No file is open until the user
// creates or opens one from the welcome card.
import { state } from './state.js';
import { $, codeEl, say } from './dom.js';
import { loadSVG, serialize } from './svgdoc.js';
import { undo, redo } from './history.js';
import { fit, zoomCenter } from './view.js';
import { setTool } from './selection.js';
import { drawOverlay } from './overlay.js';
import { updateStatus, refreshAll } from './render.js';
import { initCanvas } from './canvas.js';
import { initOpen } from './open.js';
import { initKeyboard } from './keyboard.js';
import { copySVG, downloadSVG, downloadPNG } from './export.js';

// Tool rail
document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

// Top bar
$('#bUndo').onclick = undo;
$('#bRedo').onclick = redo;
$('#bZoomIn').onclick = () => zoomCenter(1.25);
$('#bZoomOut').onclick = () => zoomCenter(0.8);
$('#bFit').onclick = fit;
$('#bDl').onclick = downloadSVG;
$('#bPng').onclick = downloadPNG;
$('#bCopy').onclick = copySVG;

// Right panel tabs
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  state.activeTab = b.dataset.tab;
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  $('#pProps').hidden = state.activeTab !== 'props';
  $('#pCode').hidden = state.activeTab !== 'code';
  $('#pHelp').hidden = state.activeTab !== 'help';
  if (state.activeTab === 'code') codeEl.value = serialize();
}));

// Code tab
$('#bApply').onclick = () => { if (loadSVG(codeEl.value, { keepView: true })) say('Code applied'); };
$('#bCopy2').onclick = copySVG;

initCanvas();
initOpen();
initKeyboard();

refreshAll();
// Text boxes change size once web fonts arrive.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawOverlay(); updateStatus(); });

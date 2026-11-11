// Pointer and wheel handling on the canvas: select, drag, draw, resize, pan, zoom.
import { state } from './state.js';
import { $, stage } from './dom.js';
import { fmt, toLocal } from './util.js';
import { viewBoxRect } from './svgdoc.js';
import { commit } from './history.js';
import { applyView, zoomAt } from './view.js';
import { drawOverlay } from './overlay.js';
import { pickTarget, select, setTool } from './selection.js';
import { snapGeom, moveEl, resizeTo } from './geometry.js';
import { currentFill, newShapeEl, appendToDoc, drawingParent, shapeFromBox, placeText } from './shapes.js';
import { renderProps, refreshValues } from './panel.js';

// At most one of these is active at a time.
let drag = null, pan = null, rsz = null, draw = null;

function startPan(e) {
  pan = { x: e.clientX, y: e.clientY, px: state.panX, py: state.panY };
  stage.classList.add('panning'); stage.setPointerCapture(e.pointerId); e.preventDefault();
}

export function startResize(e) {
  e.stopPropagation(); e.preventDefault();
  rsz = { el: state.sel, o: snapGeom(state.sel), moved: false };
  stage.setPointerCapture(e.pointerId);
}

function onPointerDown(e) {
  if (!state.root) return;
  if (e.button === 1 || state.spaceDown || state.tool === 'hand') { startPan(e); return; }
  if (e.button !== 0) return;

  if (state.tool !== 'select') {
    const parent = drawingParent();
    const p = toLocal(e.clientX, e.clientY, parent);
    if (state.tool === 'text') { placeText(p); e.preventDefault(); return; }
    const el = newShapeEl(state.tool, currentFill());
    appendToDoc(el);
    draw = { el, kind: state.tool, a: p, parent, moved: false, sx: e.clientX, sy: e.clientY };
    stage.setPointerCapture(e.pointerId); e.preventDefault(); return;
  }

  const t = pickTarget(e.target, e.altKey);
  if (!t) { select(null); startPan(e); return; }
  if (t !== state.sel) select(t);
  drag = { el: t, start: toLocal(e.clientX, e.clientY, t.parentNode), o: snapGeom(t), moved: false, sx: e.clientX, sy: e.clientY };
  stage.setPointerCapture(e.pointerId); e.preventDefault();
}

function onPointerMove(e) {
  if (state.root) {
    const p = toLocal(e.clientX, e.clientY, state.root);
    $('#sx').textContent = fmt(p.x); $('#sy').textContent = fmt(p.y);
  }
  if (pan) {
    state.panX = pan.px + e.clientX - pan.x; state.panY = pan.py + e.clientY - pan.y;
    applyView(); return;
  }
  if (draw) {
    const p = toLocal(e.clientX, e.clientY, draw.parent);
    if (Math.hypot(e.clientX - draw.sx, e.clientY - draw.sy) > 2) draw.moved = true;
    shapeFromBox(draw.kind, draw.el, draw.a, p, e.shiftKey);
    state.sel = draw.el; drawOverlay(); return;
  }
  if (rsz) {
    resizeTo(rsz.el, rsz.o, toLocal(e.clientX, e.clientY, rsz.el.parentNode), e.shiftKey, e.altKey);
    rsz.moved = true; drawOverlay(); refreshValues(); return;
  }
  if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return;
    const p = toLocal(e.clientX, e.clientY, drag.el.parentNode);
    moveEl(drag.el, drag.o, p.x - drag.start.x, p.y - drag.start.y, e.shiftKey);
    drag.moved = true; drawOverlay(); refreshValues(); return;
  }
  if (state.tool === 'select') {
    const t = pickTarget(e.target, e.altKey);
    if (t !== state.hover) { state.hover = t; drawOverlay(); }
  }
}

function endPointer() {
  if (pan) { pan = null; stage.classList.remove('panning'); }
  if (drag) { if (drag.moved) commit(); drag = null; }
  if (rsz) { if (rsz.moved) commit(); rsz = null; }
  if (draw) {
    if (!draw.moved) {   // a click: drop a shape of a sensible size
      const vb = viewBoxRect(), s = Math.min(vb.w, vb.h) / 5;
      shapeFromBox(draw.kind, draw.el, { x: draw.a.x - s / 2, y: draw.a.y - s / 2 }, { x: draw.a.x + s / 2, y: draw.a.y + s / 2 }, false);
    }
    state.sel = draw.el; draw = null;
    commit(); renderProps(); setTool('select');
  }
}

function onPointerLeave() {
  $('#sx').textContent = '–'; $('#sy').textContent = '–';
  if (!drag && !pan && !rsz && !draw && state.hover) { state.hover = null; drawOverlay(); }
}

// Ctrl/⌘ + wheel or a plain mouse wheel zooms; trackpad two-finger scroll pans.
function onWheel(e) {
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) < 1) zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  else { state.panX -= e.deltaX; state.panY -= e.deltaY; applyView(); }
}

export function initCanvas() {
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('pointerleave', onPointerLeave);
  stage.addEventListener('wheel', onWheel, { passive: false });
  new ResizeObserver(() => drawOverlay()).observe(stage);
}

// Zoom and pan of the canvas.
import { state } from './state.js';
import { $, stage, viewport } from './dom.js';
import { drawOverlay } from './overlay.js';

const MIN = 0.05, MAX = 64;

export function applyView() {
  viewport.style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.scale})`;
  $('#zoomLbl').textContent = Math.round(state.scale * 100) + '%';
  drawOverlay();
}

export function fit() {
  const r = stage.getBoundingClientRect();
  const s = Math.min((r.width - 96) / state.artW, (r.height - 96) / state.artH);
  state.scale = Math.max(MIN, Math.min(MAX, s || 1));
  state.panX = (r.width - state.artW * state.scale) / 2;
  state.panY = (r.height - state.artH * state.scale) / 2;
  applyView();
}

export function zoomAt(f, mx, my) {
  const ns = Math.max(MIN, Math.min(MAX, state.scale * f));
  state.panX = mx - (mx - state.panX) * ns / state.scale;
  state.panY = my - (my - state.panY) * ns / state.scale;
  state.scale = ns; applyView();
}

export function zoomCenter(f) {
  const r = stage.getBoundingClientRect();
  zoomAt(f, r.width / 2, r.height / 2);
}

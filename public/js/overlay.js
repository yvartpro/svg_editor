// Selection / hover boxes and the resize handle drawn over the canvas.
import { state } from './state.js';
import { h, stage, overlay } from './dom.js';
import { num, fmt, tagOf } from './util.js';
import { canResize } from './geometry.js';
import { startResize } from './canvas.js';

function boxFor(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
}

const boxStyle = b => `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;

export function drawOverlay() {
  const { root, sel, hover } = state;
  overlay.replaceChildren();
  if (!root) return;
  if (hover && hover !== sel && root.contains(hover)) {
    overlay.append(h('div', { class: 'box hover', style: boxStyle(boxFor(hover)) }));
  }
  if (!sel || !root.contains(sel)) return;

  const b = boxFor(sel);
  let label = tagOf(sel);
  try { const bb = sel.getBBox(); label += ` ${fmt(bb.width)}×${fmt(bb.height)}`; } catch (e) {}
  overlay.append(h('div', { class: 'box', style: boxStyle(b) }, h('span', { class: 'tag' }, label)));

  if (canResize(sel) && state.tool === 'select') {
    let hx = b.x + b.w, hy = b.y + b.h;
    if (tagOf(sel) === 'line') {
      const m = sel.getScreenCTM(), s = stage.getBoundingClientRect();
      if (m) { const p = new DOMPoint(num(sel.getAttribute('x2')), num(sel.getAttribute('y2'))).matrixTransform(m); hx = p.x - s.left; hy = p.y - s.top; }
    }
    const hd = h('div', { class: 'handle', style: `left:${hx}px;top:${hy}px`, title: 'Resize — hold Shift to keep the ratio' });
    hd.addEventListener('pointerdown', startResize);
    overlay.append(hd);
  }
}

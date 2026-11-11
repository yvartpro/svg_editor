// DOM references and small element builders.
export const SVGNS = 'http://www.w3.org/2000/svg';
export const $ = s => document.querySelector(s);

export const stage = $('#stage');
export const viewport = $('#viewport');
export const art = $('#art');
export const overlay = $('#overlay');
export const layersEl = $('#layers');
export const propsEl = $('#pProps');
export const codeEl = $('#code');
export const swatchesEl = $('#swatches');

// Flash a short message in the status bar.
let sayTimer;
export function say(msg, ms = 2400) {
  const m = $('#msg'); m.textContent = msg; m.classList.add('on');
  clearTimeout(sayTimer); sayTimer = setTimeout(() => m.classList.remove('on'), ms);
}

// h('div', { class: 'x', onclick: fn }, child, 'text')
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : String(k));
  return e;
}

// An icon from the sprite in index.html.
export function icon(name) {
  const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#i-' + name); s.append(u); return s;
}

export const isEditableTarget = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

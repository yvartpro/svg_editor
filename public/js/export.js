// Copy code, download SVG, download PNG.
import { state } from './state.js';
import { $, codeEl, say } from './dom.js';
import { serialize, fileName } from './svgdoc.js';

const PNG_SCALE = 4;

export async function copySVG() {
  try { await navigator.clipboard.writeText(serialize()); say('SVG code copied'); }
  catch (e) {
    $('.tab[data-tab="code"]').click();
    codeEl.focus(); codeEl.select();
    say('Clipboard blocked — code is selected, press Ctrl C', 4000);
  }
}

function download(blob, name) {
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say('Saving ' + name);
  } catch (e) { say('Download blocked — use Copy code'); }
}

export function downloadSVG() {
  download(new Blob([serialize()], { type: 'image/svg+xml' }), fileName('.svg'));
}

export function downloadPNG() {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = Math.round(state.artW * PNG_SCALE); c.height = Math.round(state.artH * PNG_SCALE);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(b => b ? download(b, fileName(`@${PNG_SCALE}x.png`)) : say('PNG export failed'), 'image/png');
  };
  img.onerror = () => say('PNG export failed for this file');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialize());
}

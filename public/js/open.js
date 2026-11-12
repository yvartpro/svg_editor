// Getting SVG in: New, Open, drag-and-drop, paste.
import { $, stage, say, isEditableTarget } from './dom.js';
import { loadSVG } from './svgdoc.js';
import { BLANK } from './samples.js';

export function initOpen() {
  const newDoc = () => { if (loadSVG(BLANK)) $('#fname').value = 'untitled.svg'; };
  const pickFile = () => $('#file').click();
  $('#bNew').onclick = newDoc; $('#wNew').onclick = newDoc;
  $('#bOpen').onclick = pickFile; $('#wOpen').onclick = pickFile;
  $('#file').onchange = async e => {
    const f = e.target.files[0];
    if (f && loadSVG(await f.text())) { $('#fname').value = f.name; say('Opened ' + f.name); }
    e.target.value = '';
  };

  stage.addEventListener('dragover', e => { e.preventDefault(); stage.classList.add('dragover'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('dragover'));
  stage.addEventListener('drop', async e => {
    e.preventDefault(); stage.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f) { if (loadSVG(await f.text())) $('#fname').value = f.name; }
    else { const t = e.dataTransfer.getData('text'); if (t && t.includes('<svg')) loadSVG(t); }
  });

  document.addEventListener('paste', e => {
    if (isEditableTarget(e.target)) return;
    const t = e.clipboardData && e.clipboardData.getData('text');
    if (t && t.includes('<svg')) { e.preventDefault(); if (loadSVG(t.slice(t.indexOf('<svg')))) say('Pasted SVG opened'); }
  });
}

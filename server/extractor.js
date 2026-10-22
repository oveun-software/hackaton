import { unzipSync, strFromU8 } from 'fflate';
import { SaxesParser } from 'saxes';

process.once('message', async input => {
const reply = result => process.send(result, () => process.exit(0));
try {
  const buffer = Buffer.from(input.buffer);
  let text = '';
  if (input.extension === '.txt') text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  else if (input.extension === '.pdf') {
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('errors.pdfInvalid');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      if (info.total > 50) throw new Error('errors.pdfPages');
      text = (await parser.getText()).text;
    } finally { await parser.destroy(); }
  } else if (input.extension === '.docx') {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new Error('errors.docxInvalid');
    let entries = 0, totalSize = 0;
    const names = new Set();
    const archive = unzipSync(buffer, { filter: entry => {
      entries++; totalSize += entry.originalSize;
      if (entries > 512 || totalSize > 32 * 1024 * 1024 || names.has(entry.name)) throw new Error('errors.docxLimit');
      names.add(entry.name);
      const wanted = /^word\/(?:document|header\d+|footer\d+)\.xml$/.test(entry.name);
      if (wanted && entry.originalSize > 2 * 1024 * 1024) throw new Error('errors.docxXml');
      return wanted;
    } });
    if (!archive['word/document.xml']) throw new Error('errors.docxMissing');
    const parts = Object.keys(archive).sort((a, b) => a === 'word/document.xml' ? -1 : b === 'word/document.xml' ? 1 : a.localeCompare(b));
    for (const name of parts) {
      const parser = new SaxesParser({ xmlns: true });
      let depth = 0, insideText = false;
      parser.on('doctype', () => { throw new Error('errors.docxDtd'); });
      parser.on('opentag', tag => {
        if (++depth > 100) throw new Error('errors.docxDepth');
        if (tag.local === 't') insideText = true;
        if (tag.local === 'tab') text += '\t';
        if (tag.local === 'br') text += '\n';
      });
      parser.on('text', value => { if (insideText) text += value; if (text.length > 40000) throw new Error('errors.textLimit'); });
      parser.on('closetag', tag => { depth--; if (tag.local === 't') insideText = false; if (['p', 'tr'].includes(tag.local)) text += '\n'; });
      parser.write(strFromU8(archive[name])).close(); text += '\n';
    }
  }
  text = text.replace(/\u0000/g, '').trim();
  if (text.length < 40) throw new Error('errors.textMissing');
  if (text.length > 40000) throw new Error('errors.textLimit');
  reply({ text });
} catch (error) { reply({ error: error.message }); }
});

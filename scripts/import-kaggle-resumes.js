import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extractor = path.join(root, 'server', 'extractor.js');

function argument(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(item => item.startsWith(prefix));
  return value ? value.slice(prefix.length).replace(/^"|"$/g, '') : fallback;
}

function usage() {
  console.log('Uso: npm run import:kaggle -- --input="C:\\ruta\\al\\dataset" [--limit=25] [--output="data\\kaggle-zetaris"]');
}

async function filesRecursively(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesRecursively(fullPath));
    else if (/\.(pdf|docx|txt)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function csvCell(value) {
  return `"${String(value).replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
}

function displayName(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Candidate';
}

function candidateId(filePath) {
  return `kaggle-${crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 16)}`;
}

async function extract(filePath) {
  const buffer = await fs.readFile(filePath);
  return new Promise((resolve, reject) => {
    const child = fork(extractor, [], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timeout extrayendo ${path.basename(filePath)}`));
    }, 25_000);
    child.once('message', result => {
      clearTimeout(timer);
      child.kill();
      if (result?.error) reject(new Error(result.error));
      else resolve(result.text);
    });
    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.send({
      buffer,
      extension: path.extname(filePath).toLowerCase()
    });
  });
}

async function main() {
  const input = argument('input');
  if (!input) {
    usage();
    process.exitCode = 1;
    return;
  }

  const inputDirectory = path.resolve(input);
  const outputDirectory = path.resolve(argument('output', path.join(root, 'data', 'kaggle-zetaris')));
  const limit = Math.min(25, Math.max(1, Number(argument('limit', '25')) || 25));
  const allFiles = (await filesRecursively(inputDirectory)).sort((a, b) => a.localeCompare(b));
  const selected = allFiles.slice(0, limit);

  if (!selected.length) throw new Error(`No se encontraron PDF, DOCX o TXT en ${inputDirectory}`);

  const rows = [];
  for (let index = 0; index < selected.length; index++) {
    const filePath = selected[index];
    process.stdout.write(`[${index + 1}/${selected.length}] Extrayendo ${path.basename(filePath)}... `);
    try {
      const text = await extract(filePath);
      const id = candidateId(path.relative(inputDirectory, filePath));
      rows.push({ id, name: displayName(filePath), document: path.basename(filePath), text });
      console.log('OK');
    } catch (error) {
      console.log(`omitido (${error.message})`);
    }
  }

  if (!rows.length) throw new Error('No se pudo extraer texto de ningún documento');
  await fs.mkdir(outputDirectory, { recursive: true });
  const profiles = [
    ['candidate_id', 'display_name'],
    ...rows.map(row => [row.id, row.name])
  ].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
  const documents = [
    ['candidate_id', 'document_name', 'cv_text'],
    ...rows.map(row => [row.id, row.document, row.text])
  ].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
  await fs.writeFile(path.join(outputDirectory, 'profiles.csv'), profiles, 'utf8');
  await fs.writeFile(path.join(outputDirectory, 'documents.csv'), documents, 'utf8');
  console.log(`\nGenerados ${rows.length} candidatos en ${outputDirectory}`);
  console.log('Copia profiles.csv y documents.csv al volumen de datos de Zetaris y crea la vista talentlens.candidates.');
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

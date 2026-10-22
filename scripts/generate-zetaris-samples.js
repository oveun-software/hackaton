import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { demoCandidates } from '../server/demo.js';

const directory = new URL('../examples/zetaris/', import.meta.url);
fs.mkdirSync(directory, {recursive:true});
const cell = value => '"' + String(value).replace(/\r?\n/g, ' ').replace(/"/g, '""') + '"';
const profiles = [['candidate_id','display_name'], ...demoCandidates.map((candidate,index) => ['fictional-'+index,candidate.name])];
const documents = [['candidate_id','document_name','cv_text'], ...demoCandidates.map((candidate,index) => ['fictional-'+index,candidate.filename,candidate.text])];
for (const [name,rows] of [['profiles.csv',profiles],['documents.csv',documents]]) {
  fs.writeFileSync(new URL(name,directory),rows.map(row=>row.map(cell).join(',')).join('\n')+'\n');
}
console.log('Generated two clearly synthetic Zetaris sources in '+fileURLToPath(directory));

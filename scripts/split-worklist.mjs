// Usage: node scripts/split-worklist.mjs <list.txt> <out-dir>
// Groups a dup-query TSV (locale \t dotted.key \t english) into batch files:
//   <out-dir>/<NN>-<group>.txt
// Grouping: keys under web.* keep their second segment (web.payments);
// everything else collapses to its first segment (validation, auth, ...).
// Small groups (< 15 lines) are merged into 99-misc.txt.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [listPath, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

let text = readFileSync(listPath, 'utf8');
if (text.charCodeAt(0) === 0xFF || text.includes('')) text = readFileSync(listPath, 'utf16le');

const groups = new Map();
for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const parts = line.split('\t');
  const key = parts[1];
  if (!key) continue;
  const segs = key.split('.');
  const group = segs[0] === 'web' && segs.length > 1 ? `web.${segs[1]}` : segs[0];
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(line);
}

const misc = [];
const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
let n = 0;
for (const [group, lines] of sorted) {
  if (lines.length < 15) {
    misc.push(...lines);
    continue;
  }
  n++;
  const name = `${String(n).padStart(2, '0')}-${group.replace(/[^a-z0-9-]/gi, '_')}.txt`;
  writeFileSync(join(outDir, name), lines.join('\n') + '\n', 'utf8');
  console.log(`${name}\t${lines.length}`);
}
if (misc.length) {
  writeFileSync(join(outDir, '99-misc.txt'), misc.join('\n') + '\n', 'utf8');
  console.log(`99-misc.txt\t${misc.length}`);
}

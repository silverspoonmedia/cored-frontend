// Usage: node scripts/apply-translations.mjs <locale> <translations.json>
// translations.json: flat map of dotted key -> translated value.
// Sets values in src/i18n/locales/<locale>.json, creating nothing new (key must exist).
import { readFileSync, writeFileSync } from 'node:fs';

const [locale, mapPath] = process.argv.slice(2);
if (!locale || !mapPath) {
  console.error('usage: node scripts/apply-translations.mjs <locale> <translations.json>');
  process.exit(1);
}

const file = new URL(`../src/i18n/locales/${locale}.json`, import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

// Resolve a dotted path where keys at any level may themselves contain dots
// (e.g. web.settings.fields['platform.jwt.ttl']). Greedy longest-prefix match
// against real object keys at each level; falls back to single-segment descent.
const resolvePath = (obj, path) => {
  const parts = path.split('.');
  let cur = obj;
  let i = 0;
  while (i < parts.length) {
    if (cur == null || typeof cur !== 'object') return { found: false };
    let advanced = false;
    for (let len = parts.length - i; len >= 1; len--) {
      const flat = parts.slice(i, i + len).join('.');
      if (Object.prototype.hasOwnProperty.call(cur, flat)) {
        if (i + len === parts.length) return { found: true, parent: cur, leaf: flat };
        if (typeof cur[flat] === 'object' && cur[flat] !== null) {
          cur = cur[flat];
          i += len;
          advanced = true;
          break;
        }
        // non-object intermediate: dead end for this prefix length, try shorter
      }
    }
    if (!advanced) return { found: false };
  }
  return { found: false };
};

const get = (obj, path) => {
  const r = resolvePath(obj, path);
  return r.found ? r.parent[r.leaf] : undefined;
};

const set = (obj, path, value) => {
  const r = resolvePath(obj, path);
  if (!r.found) return false;
  r.parent[r.leaf] = value;
  return true;
};

let applied = 0;
const missing = [];
for (const [key, value] of Object.entries(map)) {
  if (get(data, key) === undefined) {
    missing.push(key);
    continue;
  }
  if (set(data, key, value)) applied++;
}

writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`applied=${applied} missing=${missing.length}`);
if (missing.length) console.log(`missing keys: ${missing.join(', ')}`);

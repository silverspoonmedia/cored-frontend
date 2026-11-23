// Usage:
//   node scripts/apply-translations.mjs <locale> <map.json> [options]
//
// Options:
//   --surface=<text>     UI surface the keys belong to (button, toast, ...)
//   --source=<text>      consuming code reference, e.g. src/views/x.vue:42
//   --curated-at=<iso>   override the curation timestamp (default: now, +07:00)
//   --feature=<name>     target src/i18n/features/<name>/<locale>.json instead of
//                        the core src/i18n/locales/<locale>.json (feature copy)
//   --dry-run            report what would change, write nothing
//
// <map.json> is either:
//   (a) a legacy flat map: { "dotted.key": "translated value" }
//       Replaces existing keys only; unknown keys are reported as missing.
//   (b) a batch object: { "meta": {...}, "entries": [ { key, value, after?, create?, leaf?, surface?, source? } ] }
//       Entries mode can create new keys when `create` is true (batch meta
//       `create: true` applies to every entry). Creation details:
//         after  — insert the new key directly behind this sibling, keeping the
//                  file grouped the way a human would have written it
//         leaf   — literal key NAME to store inside the deepest existing parent
//                  object (settings labels are literal dotted keys such as
//                  `microstock.ai.vision.connection`, not nested objects), e.g.
//                  key `web.settings.fields.microstock.ai.vision.connection`
//                  + leaf `microstock.ai.vision.connection` inserts one flat key
//                  into `web.settings.fields`. Must be a string.
//         surface/source — per-entry override of the curation-log metadata
//
// JSON carries no comments, so the "curated at <timestamp>" flag for every
// applied key is written to src/i18n/curation-log.json (see check-curation-log.mjs).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith('--'));
const [locale, mapPath] = argv.filter((a) => !a.startsWith('--'));

if (!locale || !mapPath) {
  console.error('usage: node scripts/apply-translations.mjs <locale> <translations.json> [--surface=<text>] [--source=<text>] [--curated-at=<iso>] [--feature=<name>] [--dry-run]');
  process.exit(1);
}

const flagValue = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const dryRun = flags.includes('--dry-run');

/** ISO-8601 with the local numeric offset, e.g. 2026-09-21T15:32:00+07:00 */
function isoWithOffset(date = new Date()) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    + `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
}

const curatedAt = flagValue('curated-at') ?? isoWithOffset();
const surface = flagValue('surface') ?? '';
const source = flagValue('source') ?? '';
const feature = flagValue('feature');

const file = feature
  ? new URL(`../src/i18n/features/${feature}/${locale}.json`, import.meta.url)
  : new URL(`../src/i18n/locales/${locale}.json`, import.meta.url);

if (!existsSync(file)) {
  console.error(`no translation file for ${feature ? `feature ${feature}` : 'core'} / ${locale}: ${file.pathname}`);
  process.exit(1);
}
const raw = readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const data = JSON.parse(raw);
const map = JSON.parse(readFileSync(mapPath, 'utf8').replace(/^\uFEFF/, ''));

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

/** Insert `key` into `parent` directly behind `anchor`, or append when absent. */
const insertAfter = (parent, anchor, key, value) => {
  if (!Object.prototype.hasOwnProperty.call(parent, anchor)) {
    parent[key] = value;
    return;
  }
  const rebuilt = {};
  for (const [k, v] of Object.entries(parent)) {
    rebuilt[k] = v;
    if (k === anchor) rebuilt[key] = value;
  }
  for (const k of Object.keys(parent)) delete parent[k];
  Object.assign(parent, rebuilt);
};

const createAllowed = (entry) => entry.create ?? map.meta?.create ?? false;

/**
 * Deepest existing object on the key's path, plus the segments still to create.
 * `web.settings.fields` + `microstock.ai.vision.connection` resolves to the
 * `fields` object with `['microstock','ai','vision','connection']` left over;
 * `entry.leaf` then inserts that dotted name as ONE literal key, which is how
 * settings labels are stored.
 */
const deepestAncestor = (root, segments) => {
  for (let take = segments.length - 1; take >= 1; take -= 1) {
    const resolved = resolvePath(root, segments.slice(0, take).join('.'));
    if (!resolved.found) continue;
    const container = resolved.parent[resolved.leaf];
    if (container && typeof container === 'object' && !Array.isArray(container)) {
      return { container, rest: segments.slice(take) };
    }
  }
  return null;
};

const entries = Array.isArray(map.entries)
  ? map.entries
  : Object.entries(map).map(([key, value]) => ({ key, value }));

const applied = [];
const created = [];
const missing = [];
const skipped = [];
const logRecords = new Map();

for (const entry of entries) {
  const { key, value, after, leaf } = entry;
  if (typeof value !== 'string') {
    skipped.push(`${key} (non-string value)`);
    continue;
  }
  if (leaf !== undefined && typeof leaf !== 'string') {
    skipped.push(`${key} (leaf must be the literal key name, got ${typeof leaf})`);
    continue;
  }

  if (get(data, key) !== undefined) {
    if (set(data, key, value)) {
      applied.push(key);
      logRecords.set(key, entry);
    }
    continue;
  }

  if (!createAllowed(entry)) {
    missing.push(key);
    continue;
  }

  const ancestor = deepestAncestor(data, key.split('.'));

  if (ancestor === null) {
    missing.push(`${key} (no existing parent object)`);
    continue;
  }

  const { container, rest } = ancestor;
  const insertKey = leaf ?? rest[0];
  const insertValue = leaf
    ? value
    : rest.slice(1).reduceRight((acc, segment) => ({ [segment]: acc }), value);

  let inserted = false;

  if (after) {
    const anchor = resolvePath(data, after);
    if (anchor.found && anchor.parent === container) {
      insertAfter(container, anchor.leaf, insertKey, insertValue);
      inserted = true;
    } else if (anchor.found) {
      skipped.push(`${key} (anchor ${after} is outside the target object)`);
    } else {
      skipped.push(`${key} (anchor not found: ${after})`);
    }
  }

  if (!inserted) container[insertKey] = insertValue;

  created.push(`${key}${after && inserted ? ` (after ${after})` : ''}`);
  logRecords.set(key, entry);
}

function writeCurationLog(records) {
  if (!records.size) return;
  const logFile = new URL('../src/i18n/curation-log.json', import.meta.url);
  const log = existsSync(logFile)
    ? JSON.parse(readFileSync(logFile, 'utf8'))
    : { version: 1, locales: {} };

  log.version = 1;
  log.updated_at = curatedAt;
  log.locales ??= {};
  log.locales[locale] ??= {};

  for (const [key, entry] of records) {
    const record = {
      curated_at: curatedAt,
      surface: entry.surface ?? surface,
      source: entry.source ?? source,
    };
    // Feature copy lives outside the core pack; the log records which pack owns it.
    if (feature) record.feature = feature;
    log.locales[locale][key] = record;
  }

  const sorted = {};
  for (const loc of Object.keys(log.locales).sort()) {
    sorted[loc] = {};
    for (const key of Object.keys(log.locales[loc]).sort()) {
      sorted[loc][key] = log.locales[loc][key];
    }
  }
  log.locales = sorted;

  writeFileSync(logFile, `${JSON.stringify(log, null, 2)}\n`, 'utf8');
}

if (!dryRun) {
  writeFileSync(file, `${JSON.stringify(data, null, 2).replaceAll('\n', eol)}${eol}`, 'utf8');
  writeCurationLog(logRecords);
}

console.log(`applied=${applied.length} created=${created.length} missing=${missing.length} skipped=${skipped.length}`);
if (created.length) console.log(`created: ${created.join(', ')}`);
if (missing.length) console.log(`missing keys: ${missing.join(', ')}`);
if (skipped.length) console.log(`skipped: ${skipped.join(', ')}`);

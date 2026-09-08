// Usage: node scripts/dup-query.mjs <locale> [...] [--ns=<prefix>] [--all]
// Prints actionable duplicate keys: locale \t key \t english
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(new URL('../i18n-duplicate-report.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const nsFilter = args.find((a) => a.startsWith('--ns='))?.slice(5) ?? null;
const includeAllowed = args.includes('--all');
const locales = args.filter((a) => !a.startsWith('--'));

for (const locale of locales) {
  const block = report.by_locale?.[locale];
  if (!block) continue;
  for (const [ns, data] of Object.entries(block.by_namespace ?? {})) {
    if (nsFilter && !ns.startsWith(nsFilter)) continue;
    for (const e of data.keys ?? []) {
      if (!includeAllowed && e.allowed) continue;
      console.log(`${locale}\t${e.key}\t${e.english ?? ''}`);
    }
  }
}

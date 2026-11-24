// Usage: node scripts/check-docs.mjs
//
// Gate for the brief/pakem split on the SPA side, mirroring the backend
// `monolith/scripts/docs-guard.php`. Documentation has two surfaces and each
// topic has exactly one owner:
//
//   docs/**             human brief — one paragraph plus a pointer table
//   .cursor/rules/*.mdc agent pakem — imperative, glob-scoped, self-sufficient
//   AGENTS.md           always-on map: scope tag plus one line per rule file
//
// The failure modes are silent by nature: a brief nobody indexed, a brief that
// grew back into an essay, a rule whose `globs:` matches nothing (so it never
// fires), a rule that AGENTS.md forgot, a relative link to a file that moved,
// a link whose `#anchor` no longer matches any heading, and `docs/agents/`
// creeping back as a second home for agent rules.
//
// Not every living doc is a brief. A deep dive, a settled-terms glossary and an
// edge-case inventory each have their own budget
// (see `docKind()`), and a deep dive only earns its size when the brief in the
// same directory links to it. The allowlist is the last resort for a file that
// outgrows even its own kind — and an entry whose file now fits is itself a
// finding, so the list can only shrink.
//
// Links that resolve outside this repo are cross-repo references to the sibling
// `monolith` checkout. CI checks out this repo alone, so those are enforced only
// when that checkout is present — a missing sibling is an unverifiable link, not
// a broken one.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(ROOT, 'docs')
const RULES = join(ROOT, '.cursor', 'rules')
const INDEX = join(DOCS, 'README.md')
const AGENTS = join(ROOT, 'AGENTS.md')
const ALLOWLIST = join(DOCS, '.docs-budget-allowlist.json')

const RULE_MAX_LINES = 60
const ALWAYS_ON_MAX_LINES = 150
const EXEMPT_DOC_DIRS = ['archive']
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.wrangler', '.vite'])

const failures = []
const note = (message) => failures.push(message)
const toPosix = (path) => path.split(sep).join('/')
const rel = (path) => toPosix(relative(ROOT, path))
const lineCount = (path) => readFileSync(path, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/).length

// The sibling `monolith` checkout, one level up. Links that point into it can
// only be verified when it is present: CI checks out this repo alone, so an
// absent sibling means "unverifiable", not "broken".
const SIBLING = resolve(ROOT, '..', 'monolith')
const siblingRepoIsPresent = () => existsSync(join(SIBLING, '.cursor', 'rules'))

/**
 * Which kind of living doc this is, and what it may cost in lines.
 *
 * The kind is derived from the file name, not from a registry: the name already
 * says what the file is, and a new kind has to be a deliberate choice here.
 * Everything that is not a named kind is a brief.
 *
 * A directory that needs more than one deep dive splits it into
 * `reference-<topic>.md` siblings; the `reference` prefix keeps every one of them
 * a deep dive, so each is still linked from the brief in the same directory.
 *
 * @param {string} relativeToDocs path relative to docs/, e.g. `archivd/reference.md`
 * @returns {{name: string, budget: number}}
 */
function docKind(relativeToDocs) {
  const name = relativeToDocs.split('/').pop()

  if (relativeToDocs === 'README.md') return { name: 'index', budget: 150 }
  if (['billing-edge-cases.md', 'daily-free-trial.md', 'reference-edge-cases.md'].includes(name))
    return { name: 'edge-case', budget: 200 }
  if (name.startsWith('reference')) return { name: 'deep-dive', budget: 400 }
  if (name === 'naming-conventions.md') return { name: 'glossary', budget: 200 }

  return { name: 'brief', budget: 90 }
}

/** Recursive file list under `dir`, skipping generated/vendor trees. */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const escapeRegex = (value) => value.replace(/[.+^${}()|[\]\\]/g, '\\$&')

/** Cursor `globs:` syntax -> RegExp over repo-relative POSIX paths. */
function globToRegex(glob) {
  let out = '^'
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i]
    if (char === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if (char === '?') {
      out += '[^/]'
    } else {
      out += escapeRegex(char)
    }
  }
  return new RegExp(`${out}$`)
}

function frontmatter(contents) {
  if (!contents.startsWith('---')) return null
  const end = contents.indexOf('---', 3)
  return end === -1 ? null : contents.slice(3, end)
}

/** Split `path#anchor` into its two halves; `anchor` is null when there is no `#`. */
function splitAnchor(link) {
  const at = link.indexOf('#')
  if (at === -1) return [link, null]
  return [link.slice(0, at), decodeURIComponent(link.slice(at + 1))]
}

/**
 * GitHub's heading slug, mirroring `docs_anchor_slug()` in the backend
 * `scripts/lib/docs-anchor-support.php` so the two guards cannot disagree.
 *
 * Letters, numbers, marks, connector punctuation (`_`), ASCII hyphens and spaces
 * survive; everything else — emphasis markers, backticks, em dashes and other
 * punctuation — is dropped. Each space then becomes one hyphen, and the spaces are
 * **not** collapsed, so `Archivd — product domain` slugs as `archivd--product-domain`
 * (the em dash is removed, leaving the two spaces that flanked it).
 */
function slugify(heading) {
  // Images first (`![alt](src)` -> `alt`), then links, so the `!` cannot leak.
  const text = heading
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\p{Pc}\s-]+/gu, '')
    .replace(/\s/gu, '-')
    .replace(/^-+|-+$/g, '')
}

const slugCache = new Map()

/**
 * Heading slugs a markdown file offers, with GitHub's `-1`/`-2` suffix for
 * duplicates. Fenced code is skipped: a shell comment (`# Full reset only when
 * intentional:`) is not a heading.
 */
function slugSet(path) {
  const cached = slugCache.get(path)
  if (cached) return cached

  const slugs = new Set()
  const seen = new Map()
  let fence = null

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }

    if (fence !== null) continue

    const heading = line.match(/^#{1,6}\s+(.*?)\s*$/)
    if (!heading) continue

    const slug = slugify(heading[1])
    if (!slug) continue

    const count = seen.get(slug) ?? 0
    seen.set(slug, count + 1)
    slugs.add(count === 0 ? slug : `${slug}-${count}`)
  }

  slugCache.set(path, slugs)
  return slugs
}

function globsOf(contents) {
  const match = frontmatter(contents)?.match(/^globs:\s*(.+)$/m)
  if (!match) return []
  return match[1]
    .trim()
    .replace(/^["'[]|["'\]]$/g, '')
    .split(',')
    .map((glob) => glob.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

// 1. Agent rules have exactly one home.
if (existsSync(join(DOCS, 'agents'))) {
  note('docs/agents/ exists — agent rules live in .cursor/rules/*.mdc')
}

if (!existsSync(INDEX)) {
  console.error('docs/README.md is missing — every living doc must be indexed')
  process.exit(1)
}

const index = readFileSync(INDEX, 'utf8')
const allowlist = existsSync(ALLOWLIST) ? (JSON.parse(readFileSync(ALLOWLIST, 'utf8')).files ?? {}) : {}

// 2. Living docs (everything but docs/archive) must be indexed and within budget.
const livingDocs = walk(DOCS)
  .filter((path) => path.endsWith('.md'))
  .filter((path) => {
    const parts = toPosix(relative(DOCS, path)).split('/')
    return !EXEMPT_DOC_DIRS.includes(parts[0])
  })
  .sort()

for (const doc of livingDocs) {
  const relativeDoc = rel(doc)
  const indexKey = relativeDoc.replace(/^docs\//, '')
  const kind = docKind(indexKey)

  if (indexKey !== 'README.md' && !index.includes(indexKey)) {
    note(`${relativeDoc} is not listed in docs/README.md`)
  }

  const lines = lineCount(doc)
  if (lines > kind.budget && !(relativeDoc in allowlist)) {
    note(
      `${relativeDoc} is ${lines} lines (kind ${kind.name}, budget ${kind.budget}) — split the invariants into a rule file ` +
        'or move narrative to docs/archive/, then add an allowlist entry only if it must stay'
    )
  }

  // A deep dive is reference material the brief in the same directory points at.
  // Unlinked, it is a second front door to the same topic.
  if (kind.name === 'deep-dive') {
    const brief = join(dirname(doc), 'README.md')

    if (existsSync(brief) && !readFileSync(brief, 'utf8').includes(relativeDoc.split('/').pop())) {
      note(`${relativeDoc} is a deep dive no brief links to — add it to ${rel(brief)}`)
    }
  }
}

for (const [allowed, reason] of Object.entries(allowlist)) {
  if (!existsSync(join(ROOT, allowed))) {
    note(`docs/.docs-budget-allowlist.json lists ${allowed}, which does not exist — drop the stale entry`)
  } else {
    const lines = lineCount(join(ROOT, allowed))
    const kind = docKind(allowed.replace(/^docs\//, ''))

    if (lines <= kind.budget) {
      note(
        `docs/.docs-budget-allowlist.json lists ${allowed} (${lines} lines) but it now fits its ` +
          `${kind.name} budget (${kind.budget}) — drop the entry`
      )
    }
  }

  if (typeof reason !== 'string' || reason.trim() === '') {
    note(`docs/.docs-budget-allowlist.json entry ${allowed} needs a reason`)
  }
}

// 3. Rule files: budget, glob targets, AGENTS.md coverage.
const ruleFiles = existsSync(RULES)
  ? readdirSync(RULES)
      .filter((name) => name.endsWith('.mdc'))
      .sort()
      .map((name) => join(RULES, name))
  : []

if (ruleFiles.length === 0) note('.cursor/rules/*.mdc is empty — the normative surface is missing')

const agents = existsSync(AGENTS) ? readFileSync(AGENTS, 'utf8') : null
if (agents === null) note('AGENTS.md is missing — it is the always-on rule map')

const repoFiles = walk(ROOT).map(rel)
let alwaysOnLines = 0

for (const rule of ruleFiles) {
  const name = rule.split(sep).pop()
  const contents = readFileSync(rule, 'utf8')
  const lines = lineCount(rule)

  const alwaysOn = /alwaysApply:\s*true/i.test(frontmatter(contents) ?? '') || frontmatter(contents) === null
  if (alwaysOn) {
    // Always-on rules are governed by the combined budget below, not by the
    // per-rule one: they carry the rules that must hold in every task. Their
    // `globs:` are still validated — an always-on rule fires everywhere, but a
    // glob that matches nothing is a stale declaration either way, and skipping
    // it here is how eight dead globs survived on the backend twin.
    alwaysOnLines += lines
  } else if (lines > RULE_MAX_LINES) {
    note(`.cursor/rules/${name} is ${lines} lines (budget ${RULE_MAX_LINES}) — split by concern`)
  }

  for (const glob of globsOf(contents)) {
    const regex = globToRegex(glob)
    if (!repoFiles.some((path) => regex.test(path))) {
      note(`.cursor/rules/${name} globs: ${glob} matches no file — the rule never fires`)
    }
  }

  if (agents !== null && !agents.includes(name)) {
    note(`.cursor/rules/${name} is not referenced in AGENTS.md`)
  }
}

if (alwaysOnLines > ALWAYS_ON_MAX_LINES) {
  note(
    `always-on rules total ${alwaysOnLines} lines (budget ${ALWAYS_ON_MAX_LINES}) — move a rule to a glob scope or trim`
  )
}

if (agents !== null) {
  for (const mentioned of new Set(agents.match(/[a-z0-9-]+\.mdc/g) ?? [])) {
    if (!existsSync(join(RULES, mentioned))) note(`AGENTS.md references ${mentioned}, which does not exist`)
  }
}

// 4. Relative markdown links in living docs, rules, AGENTS.md and the root README
//    must resolve — path *and* `#anchor`. The path half catches a file that moved;
//    the anchor half catches a heading that was reworded, which leaves every deep
//    link into it pointing at nothing. External links keep the path check only:
//    their anchors belong to someone else's site.
//
//    The root README is the front door and is not under docs/, so the living-doc
//    walk never reaches it: a dead anchor there stayed invisible until it was added
//    here. It gets the link and anchor checks, not a line budget.
const ROOT_README = join(ROOT, 'README.md')
const linkSources = [
  ...livingDocs,
  ...ruleFiles,
  ...(agents !== null ? [AGENTS] : []),
  ...(existsSync(ROOT_README) ? [ROOT_README] : []),
]

let unverifiable = 0

for (const source of linkSources) {
  const contents = readFileSync(source, 'utf8')

  for (const match of contents.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const link = match[1]
    if (/^(https?:|mailto:|tel:)/.test(link)) continue

    const [path, anchor] = splitAnchor(link)

    // A same-file anchor resolves against the file the link is written in.
    if (path === '' && anchor !== null) {
      if (!slugSet(source).has(anchor)) {
        note(`${rel(source)} links to ${link}, and no heading in that file has that anchor`)
      }
      continue
    }

    if (path === '') continue

    const resolved = resolve(dirname(source), decodeURIComponent(path))

    if (!resolved.startsWith(ROOT)) {
      // Cross-repo reference (the sibling `monolith` checkout). Enforced only
      // when that checkout is present — CI runs this repo alone, so a missing
      // sibling is an unverifiable link, not a broken one. The count is reported
      // on the OK line so a green run cannot be read as "every link verified".
      if (!siblingRepoIsPresent()) {
        unverifiable += 1
        continue
      }
      if (!existsSync(resolved)) note(`${rel(source)} links to ${link}, which does not exist`)
      continue
    }

    if (!existsSync(resolved)) {
      note(`${rel(source)} links to ${link}, which does not exist`)
      continue
    }

    if (anchor === null || !/\.mdc?$/i.test(resolved)) continue

    if (!slugSet(resolved).has(anchor)) {
      note(`${rel(source)} links to ${link}, and no heading in ${rel(resolved)} has that anchor`)
    }
  }
}

if (failures.length) {
  console.error(`docs check: ${failures.length} finding(s)`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exitCode = 1
} else {
  console.log(
    `docs check: OK (${livingDocs.length} living doc(s), ${ruleFiles.length} rule(s), ${alwaysOnLines} always-on line(s)` +
      (unverifiable > 0 ? `, ${unverifiable} cross-repo link(s) unverified — sibling checkout absent` : '') +
      ')'
  )
}

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Convention guard for realtime wiring.
 *
 * Channel lifecycle (join, listener binding, leave, deferring the attach until
 * Echo initializes) lives in `src/composables/echo/`. Hand-rolling it per
 * composable is what produced the recurring bugs this refactor removed:
 * a second consumer calling `echo.leave()` on a shared channel, a dynamic
 * channel name whose previous value was never left, and views that stayed deaf
 * because they used `if (!getEcho()) return` instead of deferring.
 *
 * The registry ref-counts per channel name and always defers, so the fix is to
 * never call these APIs anywhere else. This test is the enforcement — adding a
 * new `echo.private()` in a composable fails CI with a pointer to the helpers.
 */

const SRC = join(__dirname, '..', 'src')

/** Files allowed to touch the Echo channel lifecycle directly. */
const LIFECYCLE_OWNERS = new Set(['composables/echo/channelRegistry.ts'])

/** Files allowed to reference the ready-bus helper. */
const READY_BUS_OWNERS = new Set([
  'composables/echo/channelRegistry.ts',
  // The leaf the registry reads the bindings from; it only declares the type.
  'composables/echo/echoBindings.ts',
  'composables/useEcho.ts',
])

function sourceFiles(dir: string): string[] {
  const out: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full))
      continue
    }
    if (entry.endsWith('.ts') || entry.endsWith('.vue')) {
      out.push(full)
    }
  }

  return out
}

/** Strip block comments so doc references to the banned APIs do not trip the guard. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

function relativeToSrc(file: string): string {
  return relative(SRC, file).split('\\').join('/')
}

describe('realtime channel conventions', () => {
  const files = sourceFiles(SRC)

  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('only the channel registry touches echo.private()/echo.leave()', () => {
    const offenders: string[] = []

    for (const file of files) {
      const path = relativeToSrc(file)
      if (LIFECYCLE_OWNERS.has(path)) continue

      const source = stripComments(readFileSync(file, 'utf8'))
      if (/\.private\(/.test(source) || /\.leave\(/.test(source)) {
        offenders.push(path)
      }
    }

    expect(
      offenders,
      'Use acquireChannel()/createRealtimeChannel() from src/composables/echo/ instead of calling echo.private()/echo.leave() directly.',
    ).toEqual([])
  })

  it('only the registry defers attach through subscribeWhenEchoReady', () => {
    const offenders: string[] = []

    for (const file of files) {
      const path = relativeToSrc(file)
      if (READY_BUS_OWNERS.has(path)) continue

      const source = stripComments(readFileSync(file, 'utf8'))
      if (/subscribeWhenEchoReady/.test(source)) {
        offenders.push(path)
      }
    }

    expect(
      offenders,
      'Channel attach deferral belongs to src/composables/echo/channelRegistry.ts; subscribe through the registry instead.',
    ).toEqual([])
  })
})

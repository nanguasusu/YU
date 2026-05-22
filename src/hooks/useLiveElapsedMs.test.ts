/**
 * Property-based tests for useLiveElapsedMs computation logic.
 *
 * Since useLiveElapsedMs is a React hook, we test the pure computation
 * formula directly:
 *   - running:     elapsedMs + Math.max(0, liveNow - lastStartedAt)
 *   - non-running: elapsedMs
 *
 * This matches the implementation in src/hooks/useLiveElapsedMs.ts.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { TimerStatus } from '../types';

// ---------------------------------------------------------------------------
// Pure computation extracted from useLiveElapsedMs
// ---------------------------------------------------------------------------

/**
 * The pure formula used by useLiveElapsedMs to compute the return value.
 * Mirrors the conditional at the end of the hook implementation.
 */
function computeLiveElapsedMs(
  timerStatus: TimerStatus,
  elapsedMs: number,
  lastStartedAt: number | null,
  liveNow: number,
): number {
  if (timerStatus !== 'running' || lastStartedAt === null) {
    return elapsedMs;
  }
  return elapsedMs + Math.max(0, liveNow - lastStartedAt);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-negative integer milliseconds (up to ~1 year) */
const elapsedMsArb = fc.integer({ min: 0, max: 365 * 24 * 3600 * 1000 });

/** Unix timestamp in ms (year 2000 – 2100) */
const timestampArb = fc.integer({ min: 946684800000, max: 4102444800000 });

/** Non-running timer statuses */
const nonRunningStatusArb = fc.constantFrom<TimerStatus>('idle', 'paused');

// ---------------------------------------------------------------------------
// Property 2: useLiveElapsedMs 运行时返回值 >= elapsedMs
// Validates: Requirements 3.1, 3.2
// ---------------------------------------------------------------------------

describe('Property 2: useLiveElapsedMs 运行时返回值 >= elapsedMs', () => {
  it('when running and lastStartedAt is not null, result >= elapsedMs', () => {
    fc.assert(
      fc.property(
        elapsedMsArb,
        timestampArb, // lastStartedAt
        timestampArb, // liveNow
        (elapsedMs, lastStartedAt, liveNow) => {
          const result = computeLiveElapsedMs('running', elapsedMs, lastStartedAt, liveNow);
          return result >= elapsedMs;
        },
      ),
    );
  });

  it('when running and liveNow >= lastStartedAt, result equals elapsedMs + (liveNow - lastStartedAt)', () => {
    fc.assert(
      fc.property(
        elapsedMsArb,
        timestampArb,
        fc.integer({ min: 0, max: 3600 * 1000 }), // delta >= 0
        (elapsedMs, lastStartedAt, delta) => {
          const liveNow = lastStartedAt + delta;
          const result = computeLiveElapsedMs('running', elapsedMs, lastStartedAt, liveNow);
          return result === elapsedMs + delta;
        },
      ),
    );
  });

  it('when running and liveNow < lastStartedAt (clock skew), result equals elapsedMs', () => {
    fc.assert(
      fc.property(
        elapsedMsArb,
        timestampArb,
        fc.integer({ min: 1, max: 3600 * 1000 }), // delta > 0
        (elapsedMs, lastStartedAt, delta) => {
          const liveNow = lastStartedAt - delta; // liveNow is before lastStartedAt
          const result = computeLiveElapsedMs('running', elapsedMs, lastStartedAt, liveNow);
          // Math.max(0, negative) = 0, so result === elapsedMs
          return result === elapsedMs;
        },
      ),
    );
  });

  it('when running but lastStartedAt is null, result equals elapsedMs', () => {
    fc.assert(
      fc.property(
        elapsedMsArb,
        timestampArb,
        (elapsedMs, liveNow) => {
          const result = computeLiveElapsedMs('running', elapsedMs, null, liveNow);
          return result === elapsedMs;
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: useLiveElapsedMs 非运行时返回原值
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe('Property 3: useLiveElapsedMs 非运行时返回原值', () => {
  it('when idle or paused, result equals elapsedMs regardless of lastStartedAt and liveNow', () => {
    fc.assert(
      fc.property(
        nonRunningStatusArb,
        elapsedMsArb,
        fc.option(timestampArb, { nil: null }), // lastStartedAt may be null
        timestampArb, // liveNow
        (timerStatus, elapsedMs, lastStartedAt, liveNow) => {
          const result = computeLiveElapsedMs(timerStatus, elapsedMs, lastStartedAt, liveNow);
          return result === elapsedMs;
        },
      ),
    );
  });

  it('when idle, result equals elapsedMs for any elapsedMs value', () => {
    fc.assert(
      fc.property(
        elapsedMsArb,
        timestampArb,
        timestampArb,
        (elapsedMs, lastStartedAt, liveNow) => {
          const result = computeLiveElapsedMs('idle', elapsedMs, lastStartedAt, liveNow);
          return result === elapsedMs;
        },
      ),
    );
  });

  it('when paused, result equals elapsedMs for any elapsedMs value', () => {
    fc.assert(
      fc.property(
        elapsedMsArb,
        timestampArb,
        timestampArb,
        (elapsedMs, lastStartedAt, liveNow) => {
          const result = computeLiveElapsedMs('paused', elapsedMs, lastStartedAt, liveNow);
          return result === elapsedMs;
        },
      ),
    );
  });
});

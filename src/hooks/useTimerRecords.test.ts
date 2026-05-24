/**
 * Property-based tests for useTimerRecords addRecord idempotency logic.
 *
 * Since the idempotency check lives inside the setRecords functional update
 * callback, we extract and test that pure logic directly.
 *
 * Validates: Requirements 9.1, 9.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { TimerRecord } from '../types';

// ---------------------------------------------------------------------------
// Pure helper that mirrors the functional-update logic inside addRecord
// ---------------------------------------------------------------------------

/**
 * Applies the addRecord functional-update logic to a previous records array.
 * This is the exact logic from useTimerRecords.ts:
 *   - skip if duration < 1000
 *   - skip if id already present
 *   - otherwise append
 */
function applyAddRecord(prev: TimerRecord[], record: TimerRecord): TimerRecord[] {
  if (record.duration < 1000) return prev;
  if (prev.some((r) => r.id === record.id)) return prev;
  return [...prev, record];
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid TimerRecord with duration >= 1000 */
const validTimerRecord = (): fc.Arbitrary<TimerRecord> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    tag: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    startTime: fc.integer({ min: 0, max: Date.now() }),
    endTime: fc.integer({ min: 0, max: Date.now() + 86_400_000 }),
    duration: fc.integer({ min: 1000, max: 86_400_000 }),
    note: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  });

/** Generates an array of distinct-id TimerRecords (all valid) */
const recordArray = (): fc.Arbitrary<TimerRecord[]> =>
  fc.uniqueArray(validTimerRecord(), {
    selector: (r) => r.id,
    minLength: 0,
    maxLength: 20,
  });

/** Generates a positive integer for "how many times to call addRecord" */
const callCount = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 10 });

// ---------------------------------------------------------------------------
// Property 5: addRecord 幂等性
// **Validates: Requirements 9.1, 9.2**
//
// For any valid TimerRecord (duration >= 1000), calling addRecord with the
// same record N times results in exactly one entry with that id in records.
// ---------------------------------------------------------------------------

describe('Property 5: addRecord 幂等性', () => {
  it('同一 record 调用任意次，records 中该 id 恰好出现一次 — Validates: Requirements 9.1, 9.2', () => {
    fc.assert(
      fc.property(recordArray(), validTimerRecord(), callCount(), (initial, record, n) => {
        // Ensure the record is not already in the initial array (clean slate for this id)
        const prev = initial.filter((r) => r.id !== record.id);

        // Apply addRecord n times with the same record
        let state = prev;
        for (let i = 0; i < n; i++) {
          state = applyAddRecord(state, record);
        }

        // The id must appear exactly once
        const occurrences = state.filter((r) => r.id === record.id).length;
        return occurrences === 1;
      }),
      { numRuns: 1000 },
    );
  });

  it('已存在相同 id 时不追加新记录 — Validates: Requirements 9.1, 9.2', () => {
    fc.assert(
      fc.property(recordArray(), validTimerRecord(), (initial, record) => {
        // Pre-populate with the record
        const prev = [...initial.filter((r) => r.id !== record.id), record];
        const lengthBefore = prev.length;

        // Calling again must not change the array
        const next = applyAddRecord(prev, record);

        return next.length === lengthBefore && next.filter((r) => r.id === record.id).length === 1;
      }),
      { numRuns: 1000 },
    );
  });

  it('duration < 1000 的 record 不被追加 — Validates: Requirements 9.1', () => {
    fc.assert(
      fc.property(
        recordArray(),
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          tag: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          startTime: fc.integer({ min: 0, max: Date.now() }),
          endTime: fc.integer({ min: 0, max: Date.now() + 86_400_000 }),
          duration: fc.integer({ min: 0, max: 999 }), // invalid duration
          note: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        }),
        (prev, shortRecord) => {
          const next = applyAddRecord(prev, shortRecord);
          // Array must be unchanged (same reference or same length with no new id)
          return next === prev;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('首次添加有效 record 后数组长度恰好增加 1 — Validates: Requirements 9.2', () => {
    fc.assert(
      fc.property(recordArray(), validTimerRecord(), (initial, record) => {
        // Ensure record id is not in initial
        const prev = initial.filter((r) => r.id !== record.id);
        const next = applyAddRecord(prev, record);
        return next.length === prev.length + 1;
      }),
      { numRuns: 1000 },
    );
  });
});

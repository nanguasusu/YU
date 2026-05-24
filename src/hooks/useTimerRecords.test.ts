/**
 * Property-based tests for useTimerRecords normalization and addRecord logic.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { TimerRecord } from '../types';
import { applyAddRecord, normalizeTodayRecords } from './useTimerRecords';

const DAY_MS = 86_400_000;
const MAX_RECORDS_PER_DAY = 500;
const FIXED_NOW = new Date('2026-05-24T12:00:00');
const FIXED_DAY_START = new Date('2026-05-24T00:00:00').getTime();

const validTimerRecord = (): fc.Arbitrary<TimerRecord> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    tag: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    startTime: fc.integer({ min: 0, max: Date.now() }),
    endTime: fc.integer({ min: 0, max: Date.now() + DAY_MS }),
    duration: fc.integer({ min: 1000, max: DAY_MS }),
    note: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  });

const todayTimerRecord = (): fc.Arbitrary<TimerRecord> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    tag: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    startTime: fc.integer({ min: FIXED_DAY_START, max: FIXED_DAY_START + DAY_MS - 1 }),
    endTime: fc.integer({ min: FIXED_DAY_START, max: FIXED_DAY_START + DAY_MS - 1 }),
    duration: fc.integer({ min: 1000, max: DAY_MS }),
    note: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  }).map((record) => ({
    ...record,
    endTime: Math.max(record.endTime, record.startTime),
  }));

const recordArray = (): fc.Arbitrary<TimerRecord[]> =>
  fc.uniqueArray(validTimerRecord(), {
    selector: (record) => record.id,
    minLength: 0,
    maxLength: 600,
  });

const callCount = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 10 });

describe('useTimerRecords helpers', () => {
  it('normalizeTodayRecords 只保留当天记录并按时间排序', () => {
    const now = FIXED_NOW;
    const todayStart = FIXED_DAY_START;
    const records: TimerRecord[] = [
      { id: 'b', title: 'b', startTime: todayStart + 2_000, endTime: todayStart + 4_000, duration: 2_000 },
      { id: 'old', title: 'old', startTime: todayStart - 1_000, endTime: todayStart + 1_000, duration: 2_000 },
      { id: 'a', title: 'a', startTime: todayStart + 1_000, endTime: todayStart + 2_000, duration: 1_000 },
    ];

    expect(normalizeTodayRecords(records, now).map((record) => record.id)).toEqual(['a', 'b']);
  });

  it('normalizeTodayRecords 会裁剪到上限 500 条，保留最新记录', () => {
    const now = FIXED_NOW;
    const todayStart = FIXED_DAY_START;
    const records = Array.from({ length: 520 }, (_, index) => ({
      id: `r-${index}`,
      title: `${index}`,
      startTime: todayStart + index,
      endTime: todayStart + index + 1_000,
      duration: 1_000,
    }));

    const normalized = normalizeTodayRecords(records, now);
    expect(normalized).toHaveLength(MAX_RECORDS_PER_DAY);
    expect(normalized[0]?.id).toBe('r-20');
    expect(normalized.at(-1)?.id).toBe('r-519');
  });

  it('同一 record 调用任意次数，结果里该 id 只出现一次', () => {
      fc.assert(
      fc.property(recordArray(), todayTimerRecord(), callCount(), (initial, record, n) => {
        const now = FIXED_NOW;
        const prev = initial.filter((item) => item.id !== record.id);
        let state = prev;

        for (let i = 0; i < n; i += 1) {
          state = applyAddRecord(state, record, now);
        }

        return state.filter((item) => item.id === record.id).length === 1;
      }),
      { numRuns: 1000 },
    );
  });

  it('duration < 1000 的 record 不会被添加', () => {
    fc.assert(
      fc.property(
        recordArray(),
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          tag: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          startTime: fc.integer({ min: FIXED_DAY_START, max: FIXED_DAY_START + DAY_MS - 1 }),
          endTime: fc.integer({ min: FIXED_DAY_START, max: FIXED_DAY_START + DAY_MS - 1 }),
          duration: fc.integer({ min: 0, max: 999 }),
          note: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        }),
        (prev, shortRecord) => {
          const now = FIXED_NOW;
          const next = applyAddRecord(prev, shortRecord, now);
          return next === prev;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('applyAddRecord 会在添加时清掉非当天记录并维持上限', () => {
    const now = FIXED_NOW;
    const todayStart = FIXED_DAY_START;
    const oldRecord: TimerRecord = {
      id: 'old',
      title: 'old',
      startTime: todayStart - 5_000,
      endTime: todayStart - 1_000,
      duration: 4_000,
    };
    const todayRecords = Array.from({ length: 500 }, (_, index) => ({
      id: `today-${index}`,
      title: `${index}`,
      startTime: todayStart + index,
      endTime: todayStart + index + 1_000,
      duration: 1_000,
    }));
    const nextRecord: TimerRecord = {
      id: 'new',
      title: 'new',
      startTime: todayStart + 10_000,
      endTime: todayStart + 12_000,
      duration: 2_000,
    };

    const result = applyAddRecord([oldRecord, ...todayRecords], nextRecord, now);
    expect(result).toHaveLength(MAX_RECORDS_PER_DAY);
    expect(result.some((record) => record.id === 'old')).toBe(false);
    expect(result.some((record) => record.id === 'new')).toBe(true);
  });
});

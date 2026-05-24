/**
 * Property-based tests for label merge deduplication logic.
 *
 * The logic under test is extracted from App.tsx:
 *   const mergedLabels = tagStore.isLoaded
 *     ? Array.from(new Set([...timerLabels, ...visibleCustomTags]))
 *     : timerLabels;
 *
 * We test the pure merge function directly:
 *   function mergeLabels(timerLabels: string[], visibleCustomTags: string[]): string[]
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure function extracted from App.tsx merge logic
// ---------------------------------------------------------------------------

/**
 * Mirrors the label merge logic in App.tsx (tagStore.isLoaded === true branch).
 * Combines two string arrays and deduplicates using a Set.
 */
function mergeLabels(timerLabels: string[], visibleCustomTags: string[]): string[] {
  return Array.from(new Set([...timerLabels, ...visibleCustomTags]));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary non-empty label string (printable ASCII, no leading/trailing spaces) */
const labelArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim() === s && s.length > 0);

/** Arbitrary array of label strings */
const labelArrayArb = fc.array(labelArb, { minLength: 0, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property 1: 标签合并去重
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------

describe('Property 1: 标签合并去重', () => {
  it('每个唯一标签在结果中恰好出现一次（无重复）', () => {
    fc.assert(
      fc.property(labelArrayArb, labelArrayArb, (timerLabels, visibleCustomTags) => {
        const result = mergeLabels(timerLabels, visibleCustomTags);

        // Each label appears exactly once: result length equals unique count
        const uniqueSet = new Set(result);
        return result.length === uniqueSet.size;
      }),
    );
  });

  it('结果包含 timerLabels 中的所有唯一标签', () => {
    fc.assert(
      fc.property(labelArrayArb, labelArrayArb, (timerLabels, visibleCustomTags) => {
        const result = mergeLabels(timerLabels, visibleCustomTags);
        const resultSet = new Set(result);

        // Every label from timerLabels must appear in the result
        return timerLabels.every((label) => resultSet.has(label));
      }),
    );
  });

  it('结果包含 visibleCustomTags 中的所有唯一标签', () => {
    fc.assert(
      fc.property(labelArrayArb, labelArrayArb, (timerLabels, visibleCustomTags) => {
        const result = mergeLabels(timerLabels, visibleCustomTags);
        const resultSet = new Set(result);

        // Every label from visibleCustomTags must appear in the result
        return visibleCustomTags.every((label) => resultSet.has(label));
      }),
    );
  });

  it('结果中的每个标签都来自两个输入数组之一', () => {
    fc.assert(
      fc.property(labelArrayArb, labelArrayArb, (timerLabels, visibleCustomTags) => {
        const result = mergeLabels(timerLabels, visibleCustomTags);
        const inputSet = new Set([...timerLabels, ...visibleCustomTags]);

        // No label in the result should be absent from both inputs
        return result.every((label) => inputSet.has(label));
      }),
    );
  });

  it('两个输入均为空时，结果为空数组', () => {
    expect(mergeLabels([], [])).toEqual([]);
  });

  it('一个输入为空时，结果等于另一个输入的去重版本', () => {
    fc.assert(
      fc.property(labelArrayArb, (labels) => {
        const resultA = mergeLabels(labels, []);
        const resultB = mergeLabels([], labels);
        const expected = Array.from(new Set(labels));
        return (
          resultA.length === expected.length &&
          resultA.every((l) => expected.includes(l)) &&
          resultB.length === expected.length &&
          resultB.every((l) => expected.includes(l))
        );
      }),
    );
  });

  it('两个输入完全相同时，结果等于输入的去重版本', () => {
    fc.assert(
      fc.property(labelArrayArb, (labels) => {
        const result = mergeLabels(labels, labels);
        const expected = Array.from(new Set(labels));
        return (
          result.length === expected.length &&
          result.every((l) => expected.includes(l))
        );
      }),
    );
  });

  it('结果长度等于两个输入合并后的唯一标签数量', () => {
    fc.assert(
      fc.property(labelArrayArb, labelArrayArb, (timerLabels, visibleCustomTags) => {
        const result = mergeLabels(timerLabels, visibleCustomTags);
        const expectedUniqueCount = new Set([...timerLabels, ...visibleCustomTags]).size;
        return result.length === expectedUniqueCount;
      }),
    );
  });
});

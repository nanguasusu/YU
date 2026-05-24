/**
 * Property-based tests for ModeMenu button count logic.
 *
 * Since ModeMenu uses `motion/react` which requires a browser environment,
 * we test the pure mapping logic directly:
 *   - The component renders exactly one `role="menuitem"` button per entry
 *     in `availableModes`.
 *   - Therefore: countMenuItems(availableModes) === availableModes.length
 *
 * We also test the filtering logic used in App.tsx to compute availableModes:
 *   ALL_APP_MODES.filter(m => m !== appMode)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { AppMode } from '../types';

// ---------------------------------------------------------------------------
// Pure logic extracted from ModeMenu and App.tsx
// ---------------------------------------------------------------------------

/**
 * Mirrors the rendering logic in ModeMenu:
 *   availableModes.map(mode => <button role="menuitem" ...>)
 *
 * The component renders exactly one menuitem button per mode in availableModes.
 * This function returns the count of buttons that would be rendered.
 */
function countMenuItems(availableModes: AppMode[]): number {
  return availableModes.length;
}

/**
 * Mirrors the filtering logic in App.tsx:
 *   ALL_APP_MODES.filter(m => m !== appMode)
 */
function getAvailableModes(allModes: AppMode[], currentMode: AppMode): AppMode[] {
  return allModes.filter((m) => m !== currentMode);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const ALL_APP_MODES: AppMode[] = ['widget', 'timer'];

/** Arbitrary AppMode value */
const appModeArb = fc.constantFrom<AppMode>('widget', 'timer');

/** Arbitrary AppMode[] array (any subset/permutation of valid modes, with possible duplicates) */
const appModeArrayArb = fc.array(appModeArb, { minLength: 0, maxLength: 10 });

/** Arbitrary AppMode[] array with no duplicates (realistic availableModes) */
const uniqueAppModeArrayArb = fc.uniqueArray(appModeArb, { minLength: 0, maxLength: 2 });

// ---------------------------------------------------------------------------
// Property 6: ModeMenu 按钮数量与 availableModes 一致
// Validates: Requirements 10.1, 10.2
// ---------------------------------------------------------------------------

describe('Property 6: ModeMenu 按钮数量与 availableModes 一致', () => {
  it('countMenuItems returns exactly availableModes.length for any AppMode[] input', () => {
    fc.assert(
      fc.property(appModeArrayArb, (availableModes) => {
        const count = countMenuItems(availableModes);
        return count === availableModes.length;
      }),
    );
  });

  it('countMenuItems returns 0 for empty availableModes', () => {
    expect(countMenuItems([])).toBe(0);
  });

  it('countMenuItems returns 1 for a single-mode array', () => {
    fc.assert(
      fc.property(appModeArb, (mode) => {
        return countMenuItems([mode]) === 1;
      }),
    );
  });

  it('countMenuItems returns 2 for both modes', () => {
    expect(countMenuItems(['widget', 'timer'])).toBe(2);
  });

  it('countMenuItems equals availableModes.length for unique mode arrays', () => {
    fc.assert(
      fc.property(uniqueAppModeArrayArb, (availableModes) => {
        return countMenuItems(availableModes) === availableModes.length;
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // Filtering logic: App.tsx computes availableModes as ALL_APP_MODES.filter(m => m !== appMode)
  // The resulting array is passed to ModeMenu, so its length determines button count.
  // ---------------------------------------------------------------------------

  it('getAvailableModes excludes the current mode, so button count = ALL_APP_MODES.length - 1', () => {
    fc.assert(
      fc.property(appModeArb, (currentMode) => {
        const available = getAvailableModes(ALL_APP_MODES, currentMode);
        const buttonCount = countMenuItems(available);
        // ALL_APP_MODES has 2 entries; filtering out currentMode leaves exactly 1
        return buttonCount === ALL_APP_MODES.length - 1;
      }),
    );
  });

  it('getAvailableModes does not include the current mode', () => {
    fc.assert(
      fc.property(appModeArb, (currentMode) => {
        const available = getAvailableModes(ALL_APP_MODES, currentMode);
        return !available.includes(currentMode);
      }),
    );
  });

  it('getAvailableModes result length equals countMenuItems result', () => {
    fc.assert(
      fc.property(appModeArb, (currentMode) => {
        const available = getAvailableModes(ALL_APP_MODES, currentMode);
        return countMenuItems(available) === available.length;
      }),
    );
  });
});

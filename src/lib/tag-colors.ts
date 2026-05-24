/**
 * tag-colors.ts
 *
 * Assigns a stable color to each tag name across the stats and timeline pages.
 *
 * Rules:
 *  - The top tag (highest total duration, or the currently-running tag) gets
 *    the global accent color.
 *  - All other tags are assigned soft palette colors in a deterministic order
 *    derived from their rank, so the mapping is consistent across pages.
 *  - If a TimerTag has an explicit colorToken, that overrides the auto-assignment.
 *
 * Backward-compatible: works with plain string tag names.
 */

import {
  SOFT_COLOR_TOKENS,
  SOFT_COLOR_VALUES,
  type SoftColorToken,
  type TimerTag,
} from '../types';

export type TagColorMap = Map<string, string>; // tagName → CSS color

/**
 * Build a tag → color map from an ordered list of tag names.
 *
 * @param orderedTags  Tag names sorted by descending duration (index 0 = top tag).
 * @param accentColor  The global accent color, assigned to orderedTags[0].
 * @param tagDefs      Optional TimerTag definitions that carry explicit colorToken overrides.
 */
export function buildTagColorMap(
  orderedTags: string[],
  accentColor: string,
  tagDefs?: TimerTag[],
): TagColorMap {
  const map: TagColorMap = new Map();
  const defsByName = new Map<string, TimerTag>(tagDefs?.map((t) => [t.name, t]));

  orderedTags.forEach((tagName, index) => {
    const def = defsByName.get(tagName);

    if (def?.colorToken) {
      // Explicit override from tag definition
      map.set(tagName, SOFT_COLOR_VALUES[def.colorToken]);
    } else if (index === 0) {
      // Top tag always gets the accent color
      map.set(tagName, accentColor);
    } else {
      // Assign soft tokens in order, cycling if there are more tags than tokens
      const token: SoftColorToken =
        SOFT_COLOR_TOKENS[(index - 1) % SOFT_COLOR_TOKENS.length];
      map.set(tagName, SOFT_COLOR_VALUES[token]);
    }
  });

  return map;
}

/**
 * Convenience: derive ordered tag names from a list of TimerRecords,
 * then build the color map.
 *
 * @param records      Today's timer records.
 * @param accentColor  Global accent color.
 * @param activeTag    The tag currently being timed (gets accent color regardless of rank).
 * @param tagDefs      Optional TimerTag definitions for explicit color overrides.
 */
export function buildTagColorMapFromRecords(
  records: { tag?: string; duration: number }[],
  accentColor: string,
  activeTag?: string,
  tagDefs?: TimerTag[],
): TagColorMap {
  // Aggregate duration per tag
  const durationMap = new Map<string, number>();
  for (const r of records) {
    const key = r.tag ?? '未分类';
    durationMap.set(key, (durationMap.get(key) ?? 0) + r.duration);
  }

  // Also include the active tag even if it has no completed records yet
  if (activeTag && !durationMap.has(activeTag)) {
    durationMap.set(activeTag, 0);
  }

  // Sort by duration descending; if activeTag exists, force it to index 0
  let sorted = [...durationMap.entries()].sort((a, b) => b[1] - a[1]);
  if (activeTag) {
    sorted = [
      ...sorted.filter(([name]) => name === activeTag),
      ...sorted.filter(([name]) => name !== activeTag),
    ];
  }

  const orderedTags = sorted.map(([name]) => name);
  return buildTagColorMap(orderedTags, accentColor, tagDefs);
}

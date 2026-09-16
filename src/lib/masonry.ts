/**
 * Small, SSR-safe masonry helpers.
 *
 * Items are placed into the currently shortest column ("balanced" masonry),
 * using each item's aspect ratio to estimate its rendered height. Column
 * widths are equal, so a unit-width item of ratio r contributes 1 / r height.
 */

/** Fallback aspect ratio (width / height) used until an image's true size is known. */
export const PLACEHOLDER_RATIO = 4 / 5;

/** Estimated fixed overhead per tile (caption, gap) in column-width units. */
const TILE_OVERHEAD = 0.04;

export function aspectRatioOf(width?: number | null, height?: number | null): number | null {
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    return width / height;
  }
  return null;
}

/**
 * Distribute `items` into `columnCount` columns, appending each to the column
 * with the smallest accumulated height. Returns the columns in order; item
 * order within a column follows the input order.
 */
export function distributeColumns<T>(
  items: readonly T[],
  columnCount: number,
  ratioOf: (item: T) => number
): T[][] {
  const count = Math.max(1, Math.floor(columnCount));
  const columns: T[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);

  for (const item of items) {
    let target = 0;
    for (let i = 1; i < count; i += 1) {
      if (heights[i] < heights[target]) {
        target = i;
      }
    }
    columns[target].push(item);
    const ratio = ratioOf(item);
    heights[target] += (ratio > 0 ? 1 / ratio : 1 / PLACEHOLDER_RATIO) + TILE_OVERHEAD;
  }

  return columns;
}

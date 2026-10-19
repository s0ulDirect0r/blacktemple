/** Repeatable pseudo-random samples for render-time procedural geometry.
 * Animation callbacks can still use Math.random; render must stay idempotent.
 */
export function seededRandom(index: number, seed: number): number {
  let value = (seed + Math.imul(index + 1, 0x9e3779b9)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 0x100000000;
}

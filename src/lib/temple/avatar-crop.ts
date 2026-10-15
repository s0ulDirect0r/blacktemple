export const AVATAR_OUTPUT_SIZE = 512;
export const MAX_AVATAR_SOURCE_BYTES = 20 * 1024 * 1024;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Source coordinates shared by the live framing and the saved square image. */
export function avatarCrop(width: number, height: number, zoom: number, horizontal: number, vertical: number) {
  if (![width, height, zoom, horizontal, vertical].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('This picture has no usable dimensions.');
  const side = Math.min(width, height) / clamp(zoom, 1, 4);
  return { x: (width - side) * clamp(horizontal, 0, 100) / 100, y: (height - side) * clamp(vertical, 0, 100) / 100, side };
}

export function avatarImageHeader(bytes: Uint8Array) {
  return (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte)
    || (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP');
}

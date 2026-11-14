// Renders the purple star behind the /calls preview card into
// src/app/calls/og-star.png (1200x630). The star is painted pixel by pixel on
// the CPU, like a fragment shader, because Satori (next/og) can only draw flat
// shapes and gradients. Run it again after changing anything here:
//
//   npx tsx scripts/render-calls-star.ts
//
// The scene: a turbulent plasma sphere with a hot core, magenta currents and an
// iridescent rim, inside a flame corona whose tongues swirl like a pinwheel and
// curl as they rise. The corona dims on the left, where the card's words sit.

import path from 'node:path';
import sharp from 'sharp';

const W = 1200;
const H = 630;
const CX = 1000;
const CY = 315;
const R = 118;
const SUPERSAMPLE = 2;
const OUT = path.join(process.cwd(), 'src/app/calls/og-star.png');

type RGB = [number, number, number];

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add = (a: RGB, b: RGB, k = 1): RGB => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;

function ramp(stops: [number, RGB][], t: number): RGB {
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  }
  return stops[stops.length - 1][1];
}

// Value noise and fractal noise in 3D, so textures wrap around the sphere without seams.
const hash3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fade = (v: number) => v * v * (3 - 2 * v);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const plane = (zz: number) =>
    lerp(lerp(hash3(xi, yi, zz), hash3(xi + 1, yi, zz), u), lerp(hash3(xi, yi + 1, zz), hash3(xi + 1, yi + 1, zz), u), v);
  return lerp(plane(zi), plane(zi + 1), w);
}
function fbm(x: number, y: number, z: number, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum / (1 - Math.pow(0.5, octaves));
}
/** Noise sampled around a circle, so it joins up all the way around the star. */
const around = (angle: number, k: number, z = 0, octaves = 4) => fbm(Math.cos(angle) * k + 11, Math.sin(angle) * k + 5, z, octaves);

const DEEP = hex('#2a1272'), PURPLE = hex('#5b2bd6'), VIOLET = hex('#7c4dff'), LILAC = hex('#a78bfa');
const LAV = hex('#c4b5fd'), PALE = hex('#ede9fe'), ICE = hex('#b9f5ff'), MAGENTA = hex('#d946ef');
const BLACK: RGB = [0, 0, 0];

const flameColor = (t: number) =>
  ramp([[0, BLACK], [0.18, DEEP], [0.38, VIOLET], [0.6, MAGENTA], [0.8, LAV], [1, PALE]], t);

/** Keeps the corona from crowding the words on the left half of the card. */
const awayFromWords = (x: number) => 0.15 + 0.85 * smooth(640, 860, x);

function surface(dx: number, dy: number, d: number, angle: number): RGB {
  const nz = Math.sqrt(1 - d * d);
  const warp = fbm(dx * 3 + 1, dy * 3, nz * 3, 3);
  const plasma = fbm(dx * 5 + warp * 2, dy * 5 + warp * 2, nz * 5, 5);
  const limb = Math.pow(nz, 0.5); // brightest at the center, darker toward the edge
  let c = ramp([[0, DEEP], [0.3, PURPLE], [0.55, VIOLET], [0.75, LILAC], [0.9, LAV], [1, PALE]], limb * (0.3 + 0.85 * plasma));
  c = mix(c, MAGENTA, smooth(0.55, 0.8, fbm(dx * 2.4 + 9, dy * 2.4, nz * 2.4, 4)) * 0.45 * limb);
  c = add(c, PALE, Math.exp(-d * d * 6) * 0.75);
  return add(c, mix(LAV, ICE, 0.5 + 0.5 * Math.sin(angle * 3 + 1)), Math.pow(1 - nz, 2.5) * 0.9);
}

function corona(angle: number, out: number): RGB {
  // Tongues sweep sideways as they rise (the pinwheel) and curl with noise (the liquid).
  const curl = around(angle, 3, out * 1.2, 3);
  const a = angle + out + (curl - 0.5) * out * 1.8;
  const o = out * 0.9;
  const warp = around(a, 4, o * 1.6, 3);
  const f = fbm(Math.cos(a) * 9 + warp * 3.8 + 3, Math.sin(a) * 9 + warp * 3.8, o * 2.6 - warp, 4);
  const tongue = clamp((f - o * 0.82) * 2.4 - 0.55);
  return flameColor(clamp(tongue * 0.95 + Math.exp(-out * 7) * 0.6));
}

function scene(x: number, y: number): RGB {
  const dx = (x - CX) / R, dy = (y - CY) / R, d = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
  const out = Math.max(0, d - 1);
  let c = add(BLACK, VIOLET, Math.exp(-out * 2.4) * 0.35 + Math.exp(-out * 0.7) * 0.08);
  c = add(c, corona(angle, out), awayFromWords(x));
  if (d < 1) c = mix(c, surface(dx, dy, d, angle), smooth(1, 0.985, d));
  return c;
}

function backgroundStar(x: number, y: number) {
  const gx = Math.floor(x / 3), gy = Math.floor(y / 3);
  return hash3(gx, gy, 9) > 0.9982 ? 0.2 + 0.5 * hash3(gx, gy, 2) : 0;
}

// Roll off only near white, so bright lavenders keep their color.
const tone = (v: number) => Math.round(255 * clamp(v < 0.85 ? v : 0.85 + 0.15 * (1 - Math.exp(-(v - 0.85) / 0.15))));

async function main() {
  const pixels = Buffer.alloc(W * H * 3);
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum: RGB = [0, 0, 0];
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          sum = add(sum, scene(x + (sx + 0.5) / SUPERSAMPLE, y + (sy + 0.5) / SUPERSAMPLE));
        }
      }
      const luminance = (sum[0] + sum[1] + sum[2]) / (3 * samples);
      const star = backgroundStar(x, y) * clamp(1 - luminance * 8); // only on dark sky
      const i = (y * W + x) * 3;
      pixels[i] = tone(sum[0] / samples + star);
      pixels[i + 1] = tone(sum[1] / samples + star);
      pixels[i + 2] = tone(sum[2] / samples + star);
    }
  }
  await sharp(pixels, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(OUT);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

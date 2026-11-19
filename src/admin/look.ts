// Photo "looks": brightness, contrast, saturation, warmth, fade and black-and-white, plus a few
// ready-made filters. Applied to the pixels directly so it behaves the same in every browser.

export type Look = { brightness: number; contrast: number; saturation: number; warmth: number; fade: number; bw: boolean };

export const PLAIN: Look = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, bw: false };

/** One-tap filters. Each is just a set of slider positions, so you can fine-tune after picking one. */
export const FILTERS: { name: string; look: Look }[] = [
  { name: 'Original', look: PLAIN },
  { name: 'Mono', look: { ...PLAIN, bw: true, contrast: 10 } },
  { name: 'Noir', look: { ...PLAIN, bw: true, contrast: 35, brightness: -6 } },
  { name: 'Warm', look: { ...PLAIN, warmth: 28, saturation: 8 } },
  { name: 'Cool', look: { ...PLAIN, warmth: -24, saturation: -5 } },
  { name: 'Faded', look: { ...PLAIN, fade: 35, contrast: -12, saturation: -18 } },
  { name: 'Vivid', look: { ...PLAIN, saturation: 35, contrast: 14 } },
  { name: 'Summer', look: { ...PLAIN, brightness: 8, warmth: 16, fade: 12, saturation: 10 } },
];

export const isPlain = (l: Look) => !l.bw && !l.brightness && !l.contrast && !l.saturation && !l.warmth && !l.fade;

/** Applies a look to a canvas, in place. Each slider runs from −100 to 100 (fade from 0 to 100). */
export function applyLook(canvas: HTMLCanvasElement, l: Look): void {
  if (isPlain(l)) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const bright = l.brightness / 250; // added to each channel
  const con = 1 + l.contrast / 100; // spread around mid-grey
  const sat = l.bw ? 0 : 1 + l.saturation / 100; // 0 = grey, 1 = as is, 2 = twice as colourful
  const warm = l.warmth / 400; // red up, blue down (or the reverse)
  const fade = (l.fade / 100) * 0.3; // lifts the darks towards a soft, washed-out light
  const lift = fade * 0.85;
  const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255;
    let g = d[i + 1] / 255;
    let b = d[i + 2] / 255;
    r += bright + warm;
    g += bright;
    b += bright - warm;
    r = (r - 0.5) * con + 0.5;
    g = (g - 0.5) * con + 0.5;
    b = (b - 0.5) * con + 0.5;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = grey + (r - grey) * sat;
    g = grey + (g - grey) * sat;
    b = grey + (b - grey) * sat;
    if (fade) {
      r = r * (1 - fade) + lift;
      g = g * (1 - fade) + lift;
      b = b * (1 - fade) + lift;
    }
    d[i] = clamp(r) * 255;
    d[i + 1] = clamp(g) * 255;
    d[i + 2] = clamp(b) * 255;
  }
  ctx.putImageData(img, 0, 0);
}

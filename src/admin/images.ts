// Photos: shrink and convert on the device before uploading, and show previews of photos
// that are saved in drafts but not live yet.
import type { GitHub } from './github';

const MAX = 2400; // longest side, in pixels
const QUALITY = 0.85;

type Prepared = { bytes: Uint8Array; ext: 'webp' | 'jpg'; previewUrl: string };

/** Resizes a photo (keeping its rotation), strips camera data, and converts it to WebP (JPEG if WebP isn't available). */
export async function preparePhoto(file: File): Promise<Prepared> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} isn’t a photo.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`Couldn’t open ${file.name}. Try a JPEG or PNG.`);
  }
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', QUALITY));
  let ext: 'webp' | 'jpg' = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY));
    ext = 'jpg';
  }
  if (!blob) throw new Error(`Couldn’t convert ${file.name}.`);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { bytes, ext, previewUrl: URL.createObjectURL(blob) };
}

/** A tidy, unique file name, e.g. "2026-11-morning-swim-k3f9.webp". */
export function photoName(original: string, ext: string): string {
  const base =
    original
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'photo';
  const month = new Date().toISOString().slice(0, 7);
  return `${month}-${base}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

// Site path (/images/x.webp) -> preview URL, for photos uploaded in this session or fetched from drafts.
const previews = new Map<string, string>();
let gh: GitHub | null = null;

export function setPreviewSource(github: GitHub) {
  gh = github;
}

export function rememberPreview(sitePath: string, url: string) {
  previews.set(sitePath, url);
}

/**
 * Shows a site image in an <img>. Published photos load straight from the site; photos that only
 * exist in drafts are fetched from GitHub instead.
 */
export function showImage(img: HTMLImageElement, sitePath: string) {
  const known = previews.get(sitePath);
  if (known) {
    img.src = known;
    return;
  }
  img.src = sitePath;
  img.onerror = async () => {
    img.onerror = null;
    if (!gh || !sitePath.startsWith('/images/')) return;
    try {
      const buf = await gh.readBytes(`public${sitePath}`);
      const url = URL.createObjectURL(new Blob([buf]));
      previews.set(sitePath, url);
      img.src = url;
    } catch {
      img.alt = 'Photo not found';
    }
  };
}

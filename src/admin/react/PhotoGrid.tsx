// A grid of photo thumbnails for the editor: drag to reorder, caption under each photo,
// optional cover star, remove. Add photos with the button or by dropping files onto the grid.
import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { sortable, moveItem } from '../sortable';
import { addPhoto, type Ctx } from '../forms';
import { showImage } from '../images';
import { scene } from '../../lib/scene';
import { toast } from '../ui';
import type { Photo } from '../albums';
import { Icon } from './Icon';

/** A thumbnail: an uploaded photo (even one only saved in drafts) or a built-in drawing. */
export function Thumb({ photo, picture }: { photo?: string; picture?: string }) {
  const img = useRef<HTMLImageElement>(null);
  const id = 't' + useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    if (photo && img.current) showImage(img.current, photo);
  }, [photo]);
  if (photo) return <img ref={img} alt="" />;
  // Built-in drawings are our own SVG, never user input.
  return <span className="pic-svg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: scene(picture || 'sea', id) }} />;
}

type Props = {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  ctx: Ctx;
  /** Uploads go to public/images/<folder>/. */
  folder: string;
  /** Builds a new entry for an uploaded photo. */
  make: (photo: string) => Photo;
  /** When given, each photo gets a star to make it the cover. */
  cover?: string;
  onCover?: (photo: string) => void;
  emptyText: string;
};

export default function PhotoGrid({ photos, onChange, ctx, folder, make, cover, onCover, emptyText }: Props) {
  const grid = useRef<HTMLOListElement>(null);
  const latest = useRef(photos);
  latest.current = photos;
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);

  // Drag and drop reordering (and arrow keys on the grip).
  useEffect(() => {
    if (!grid.current) return;
    return sortable({
      container: grid.current,
      items: '.pg-item',
      handle: '.ed-grip',
      grid: true,
      onMove: (from, to) => onChange(moveItem([...latest.current], from, to)),
    });
  }, [onChange]);

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setBusy((n) => n + images.length);
    for (const file of images) {
      try {
        const path = await addPhoto(file, folder, ctx);
        onChange([...latest.current, make(path)]);
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setBusy((n) => n - 1);
      }
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    upload([...e.dataTransfer.files]);
  };

  const set = (i: number, patch: Partial<Photo>) => onChange(latest.current.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const currentCover = cover || photos.find((p) => p.photo)?.photo || '';

  return (
    <div
      className={`pg${over ? ' over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <div className="pg-tools">
        <label className="ed-btn solid">
          <Icon name="photo" size={16} /> Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="ed-file"
            onChange={(e) => {
              const files = [...(e.target.files || [])];
              e.target.value = '';
              upload(files);
            }}
          />
        </label>
        <span className="ed-hint">{busy ? `Preparing ${busy} photo${busy > 1 ? 's' : ''}…` : 'or drop photos here. Drag the grip to reorder.'}</span>
      </div>
      {photos.length === 0 ? (
        <p className="pg-empty soft">{emptyText}</p>
      ) : (
        <ol className="pg-grid" ref={grid}>
          {photos.map((p, i) => {
            const isCover = !!onCover && !!p.photo && p.photo === currentCover;
            return (
              <li className="pg-item" key={`${p.photo || p.picture}-${i}`}>
                <div className="pg-thumb">
                  <Thumb photo={p.photo} picture={p.picture} />
                  {onCover && p.photo && (
                    <button
                      type="button"
                      className={`pg-star${isCover ? ' on' : ''}`}
                      aria-pressed={isCover}
                      aria-label={isCover ? 'This is the cover' : 'Use as cover'}
                      title={isCover ? 'Cover photo' : 'Use as cover'}
                      onClick={() => onCover(p.photo)}
                    >
                      <Icon name="star" size={16} />
                    </button>
                  )}
                </div>
                <div className="pg-row">
                  <button type="button" className="ed-icon ed-grip" aria-label={`Photo ${i + 1}. Drag, or use the arrow keys, to reorder.`} title="Drag to reorder">
                    <Icon name="grip" />
                  </button>
                  <input
                    className="pg-caption"
                    value={p.caption}
                    placeholder="Caption"
                    aria-label={`Caption for photo ${i + 1}`}
                    onChange={(e) => set(i, { caption: e.target.value })}
                  />
                  <button
                    type="button"
                    className="ed-icon"
                    aria-label={`Remove photo ${i + 1}`}
                    title="Remove"
                    onClick={() => onChange(latest.current.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// The editor's Gallery screen: single photos (drag to reorder, captions) and the albums
// (drag to set their order on the site; click one to edit it).
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoGrid, { Thumb } from './PhotoGrid';
import { Icon } from './Icon';
import { sortable, moveItem } from '../sortable';
import { coverOf, type Album, type Photo } from '../albums';
import type { Ctx } from '../forms';

type Gallery = { gallery: Photo[]; albums: string[] };
type Props = { gallery: Gallery; albums: Album[]; ctx: Ctx; onChange: (g: Gallery) => void };

export default function GalleryEditor({ gallery: initial, albums, ctx, onChange }: Props) {
  const [g, setG] = useState<Gallery>(initial);
  const byId = new Map(albums.map((a) => [a.id, a]));

  const update = useCallback(
    (next: Gallery) => {
      setG(next);
      onChange(next);
    },
    [onChange],
  );
  const latest = useRef(g);
  latest.current = g;

  const setPhotos = useCallback((photos: Photo[]) => update({ ...latest.current, gallery: photos }), [update]);

  const albumGrid = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!albumGrid.current) return;
    return sortable({
      container: albumGrid.current,
      items: '.pg-item',
      handle: '.ed-grip',
      grid: true,
      onMove: (from, to) => update({ ...latest.current, albums: moveItem([...latest.current.albums], from, to) }),
    });
  }, [update]);

  return (
    <div className="ed-fields">
      <section className="ed-field">
        <span className="lab">Single photos</span>
        <PhotoGrid
          photos={g.gallery}
          onChange={setPhotos}
          ctx={ctx}
          folder="gallery"
          make={(photo) => ({ picture: 'sea', photo, caption: '' })}
          emptyText="No single photos yet."
        />
      </section>

      <section className="ed-field ed-albums">
        <div className="ed-list-head">
          <span className="lab">Albums</span>
          <a href="#/albums/new" className="ed-btn solid">
            <Icon name="plus" size={16} /> New album
          </a>
        </div>
        <span className="ed-hint">Each album is its own page, like a short travel post. Drag to set their order; Save to keep it.</span>
        {g.albums.length === 0 ? (
          <p className="pg-empty soft">No albums yet. Make one for a trip or a theme.</p>
        ) : (
          <ol className="pg-grid albums" ref={albumGrid}>
            {g.albums.map((id, i) => {
              const a = byId.get(id);
              if (!a) return null;
              return (
                <li className="pg-item" key={id}>
                  <a className="pg-thumb" href={`#/albums/${encodeURIComponent(id)}`} aria-label={`Edit album ${a.title || id}`}>
                    <Thumb photo={coverOf(a)} />
                  </a>
                  <div className="pg-row">
                    <button type="button" className="ed-icon ed-grip" aria-label={`Album ${i + 1}, ${a.title}. Drag, or use the arrow keys, to reorder.`} title="Drag to reorder">
                      <Icon name="grip" />
                    </button>
                    <a className="pg-album-title" href={`#/albums/${encodeURIComponent(id)}`}>
                      <span>{a.title || id}</span>
                      <span className="soft">
                        {[a.location, `${a.photos.length} photo${a.photos.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                        {a.draft ? ' · Draft' : ''}
                      </span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

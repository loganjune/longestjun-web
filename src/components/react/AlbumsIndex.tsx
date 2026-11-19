// The Gallery page's albums (under the single photos): cover cards, with the album's name over
// the cover on hover, and a tag filter when albums have tags. The featured album is shown
// separately at the top of the page.
import { useState } from 'react';
import { Picture } from './Picture';

type Album = { id: string; href: string; title: string; location: string; date: string; description: string; cover: string; count: number; tags: string[] };

export default function AlbumsIndex({ albums, tags }: { albums: Album[]; tags: string[] }) {
  const [filter, setFilter] = useState('All');
  const shown = albums.filter((a) => filter === 'All' || a.tags.includes(filter));
  const rest = shown;
  const photos = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

  return (
    <>
      <div className="split proj-bar">
        <span className="lab">Albums</span>
        {tags.length > 0 && (
          <div className="filters lab" role="group" aria-label="Show albums tagged">
            {['All', ...tags].map((t) => (
              <button key={t} type="button" aria-pressed={t === filter} onClick={() => setFilter(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <div key={filter}>
        {rest.length > 0 && (
          <div className="cards">
            {rest.map((a, i) => (
              <a className="card album rise" href={a.href} key={a.id} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <div className="ph fill">
                  <Picture picture={a.cover} alt="" />
                  <span className="album-name disp" aria-hidden="true">
                    {a.title}
                  </span>
                </div>
                <div className="cap">
                  <div>
                    <h3 className="album-title">{a.title}</h3>
                    {(a.location || a.tags.length > 0) && <p>{[a.location, a.tags.join(', ')].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <span className="lab soft">{photos(a.count)} →</span>
                </div>
              </a>
            ))}
          </div>
        )}
        {shown.length === 0 && <p className="sample">No albums with this tag yet.</p>}
      </div>
    </>
  );
}

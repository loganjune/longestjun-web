// The Projects page: status filter (All / Building / Shipped / Idea) and the project cards.
// Changing the filter fades the matching cards in, one after another.
import { useState } from 'react';
import { Picture } from './Picture';

type Project = { title: string; status: string; year: string; description: string; picture: string; link?: string };

const STATUSES = ['All', 'Building', 'Shipped', 'Idea'];

export default function ProjectsFilter({ projects }: { projects: Project[] }) {
  const [status, setStatus] = useState('All');
  const shown = status === 'All' ? projects : projects.filter((p) => p.status === status);

  return (
    <>
      <div className="split proj-bar">
        <span className="lab soft" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'project' : 'projects'}
        </span>
        <div className="filters lab" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={s === status} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {/* A new key on each filter change restarts the fade-in. */}
      <div className="cards" key={status}>
        {shown.map((p, i) => (
          <article className="card rise" key={p.title + i} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            <div className="ph fill">
              <Picture picture={p.picture} alt="" />
            </div>
            <div className="cap">
              <div>
                <span className="lab soft">
                  {p.status} · {p.year}
                </span>
                <h3>{p.link ? <a href={p.link}>{p.title}</a> : p.title}</h3>
                <p>{p.description}</p>
              </div>
              <span className="arrow">→</span>
            </div>
          </article>
        ))}
      </div>
      {shown.length === 0 && <p className="sample">Nothing here yet.</p>}
    </>
  );
}

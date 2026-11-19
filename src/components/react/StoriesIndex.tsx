// The Stories page: the newest story large at the top, the rest as cards, and a filter
// (All / Notes / Travel).
import { useState } from 'react';
import { Picture } from './Picture';

type Story = { kind: 'Note' | 'Travel'; id: string; href: string; title: string; date: string; description: string; picture: string; location: string };

const FILTERS = ['All', 'Notes', 'Travel'] as const;

export default function StoriesIndex({ stories }: { stories: Story[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const shown = stories.filter((s) => filter === 'All' || (filter === 'Notes' ? s.kind === 'Note' : s.kind === 'Travel'));
  const [lead, ...rest] = shown;
  const meta = (s: Story) => [s.kind === 'Travel' ? s.location || 'Travel' : 'Note', s.date].filter(Boolean).join(' · ');

  return (
    <>
      <div className="split proj-bar">
        <span className="lab soft" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'story' : 'stories'}
        </span>
        <div className="filters lab" role="group" aria-label="Show stories">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={f === filter} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {!lead ? (
        <p className="sample">Nothing here yet.</p>
      ) : (
        <div key={filter}>
          <a className="story-lead fill rise" href={lead.href}>
            <Picture picture={lead.picture} alt="" />
            <span className="story-lead-text">
              <span className="lab">{meta(lead)}</span>
              <span className="story-lead-title">{lead.title}</span>
              {lead.description && <span className="story-lead-desc">{lead.description}</span>}
              <span className="lab">Read →</span>
            </span>
          </a>
          {rest.length > 0 && (
            <div className="cards story-cards">
              {rest.map((s, i) => (
                <a className="card story-card rise" href={s.href} key={s.kind + s.id} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                  <div className="ph fill">
                    <Picture picture={s.picture} alt="" />
                  </div>
                  <span className="lab soft">{meta(s)}</span>
                  <h3>{s.title}</h3>
                  {s.description && <p>{s.description}</p>}
                  <span className="lab">Read →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

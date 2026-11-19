// "Stories": notes and travel albums (albums that have a written story), newest first.
// Used by the Stories page and the homepage's recent stories.
import { getNotes } from './notes';
import { getAlbums, albumCover } from './albums';
import { url } from './url';

export type Story = {
  kind: 'Note' | 'Travel';
  id: string;
  href: string;
  title: string;
  date: Date | null;
  description: string;
  /** A photo path or a built-in drawing name, for the card. */
  picture: string;
  location: string;
};

export async function getStories(): Promise<Story[]> {
  const notes = (await getNotes()).map(
    (n): Story => ({
      kind: 'Note',
      id: n.id,
      href: url(`notes/${n.id}`),
      title: n.data.title,
      date: n.data.date,
      description: n.data.description || '',
      picture: n.data.cover || 'dusk',
      location: '',
    }),
  );
  const travel = (await getAlbums())
    .filter((a) => a.body?.trim())
    .map(
      (a): Story => ({
        kind: 'Travel',
        id: a.id,
        href: url(`gallery/${a.id}`),
        title: a.data.title,
        date: a.data.date ?? null,
        description: a.data.description || '',
        picture: albumCover(a.data),
        location: a.data.location || '',
      }),
    );
  return [...notes, ...travel].sort((x, y) => (y.date?.valueOf() ?? 0) - (x.date?.valueOf() ?? 0));
}

// The Gallery screen and the album editor. The screens themselves are React components
// (src/admin/react/); this file loads and saves their data and plugs them into the editor.
//
// Files:
// - src/data/gallery.json: single photos ("gallery") and the order of albums ("albums").
// - src/content/albums/<id>.md: one album. Details and photos in the header; the travel story below.
import { createElement, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import type { GitHub, Change } from './github';
import { parseFrontmatter, serializeFrontmatter, uniqueId } from './frontmatter';
import { el, button, busy, toast, confirmBox } from './ui';
import { saveBar } from './forms';
import type { View } from './app';
import GalleryEditor from './react/GalleryEditor';
import AlbumEditor from './react/AlbumEditor';

const DIR = 'src/content/albums';
const GALLERY = 'src/data/gallery.json';

export type Photo = { photo: string; caption: string; picture?: string };
export type Album = {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  cover: string;
  draft: boolean;
  photos: Photo[];
  body: string;
};

const str = (v: unknown) => (typeof v === 'string' ? v : v instanceof Date ? v.toISOString().slice(0, 10) : '');

function parseAlbum(id: string, text: string): Album {
  const { data, body } = parseFrontmatter(text);
  const photos = Array.isArray(data.photos) ? data.photos.map((p: any) => ({ photo: str(p?.photo), caption: str(p?.caption) })) : [];
  return {
    id,
    title: str(data.title),
    location: str(data.location),
    date: str(data.date).slice(0, 10),
    description: str(data.description),
    cover: str(data.cover),
    draft: data.draft === true,
    photos,
    body,
  };
}

export async function loadAlbums(gh: GitHub): Promise<Album[]> {
  const files = (await gh.listDir(DIR)).filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  return Promise.all(files.map(async (f) => parseAlbum(f.name.slice(0, -3), (await gh.readText(f.path)) || '')));
}

export const coverOf = (a: Pick<Album, 'cover' | 'photos'>) => a.cover || a.photos[0]?.photo || '';

/** Mounts a React screen into a plain element; returns the element and a clean-up function. */
function mount<P extends object>(component: ComponentType<P>, props: P) {
  const host = el('div', { cls: 'ed-react' });
  const root = createRoot(host);
  root.render(createElement(component, props));
  return { host, unmount: () => root.unmount() };
}

// ---------- Gallery screen ----------

export async function galleryView(gh: GitHub, onSaved: () => void): Promise<View> {
  const gallery = JSON.parse((await gh.readText(GALLERY)) || '{"gallery":[]}');
  const albums = await loadAlbums(gh);
  const ids = new Set(albums.map((a) => a.id));
  // Keep the album order in step with the album files that exist.
  const known: string[] = (gallery.albums || []).filter((id: string) => ids.has(id));
  gallery.albums = [...known, ...albums.map((a) => a.id).filter((id) => !known.includes(id)).sort()];

  let latest = gallery;
  const bar = saveBar('Saved', async (photos) => {
    await gh.commit([{ path: GALLERY, text: JSON.stringify(latest, null, 2) + '\n' }, ...photos], 'Update gallery');
    onSaved();
  });
  const { host, unmount } = mount(GalleryEditor, {
    gallery,
    albums,
    ctx: bar.ctx,
    onChange: (next: any) => {
      latest = next;
      bar.ctx.onChange();
    },
  });
  return {
    title: 'Gallery',
    jp: '写真',
    intro: 'Single photos show first on the Gallery page, then your albums. Drag to reorder.',
    body: host,
    footer: bar.footer,
    isDirty: bar.isDirty,
    destroy: unmount,
  };
}

// ---------- Album editor ----------

/** Adds or removes an album id in gallery.json's order list, as one more file for the same save. */
async function galleryOrderChange(gh: GitHub, edit: (order: string[]) => string[]): Promise<Change> {
  const gallery = JSON.parse((await gh.readText(GALLERY)) || '{"gallery":[]}');
  gallery.albums = edit(gallery.albums || []);
  return { path: GALLERY, text: JSON.stringify(gallery, null, 2) + '\n' };
}

export async function albumView(gh: GitHub, id: string | null, go: (hash: string) => void, onSaved: () => void): Promise<View> {
  const isNew = id === null;
  const path = isNew ? '' : `${DIR}/${id}.md`;
  let album: Album = { id: id || '', title: '', location: '', date: new Date().toLocaleDateString('en-CA'), description: '', cover: '', draft: false, photos: [], body: '' };
  if (!isNew) {
    const text = await gh.readText(path);
    if (text === null) throw new Error('That album doesn’t exist any more.');
    album = parseAlbum(id, text);
  }

  // The React screen hands back the latest album on every change; the story's text is read at save time.
  let latest = album;
  let getStory = () => album.body;

  const del = isNew
    ? null
    : button(
        'Delete album',
        async () => {
          if (!(await confirmBox('Delete this album?', `“${latest.title || id}” and its page will be removed when you publish. Its photos stay in the repo’s history.`, 'Delete', true))) return;
          await busy(del!, 'Deleting…', async () => {
            await gh.commit([{ path, remove: true }, await galleryOrderChange(gh, (o) => o.filter((x) => x !== id))], `Delete album “${latest.title || id}”`);
            toast('Album deleted from drafts.');
            onSaved();
            go('#/gallery');
          });
        },
        'ed-btn danger quiet',
      );

  const bar = saveBar(
    isNew ? 'Not saved yet' : 'Saved',
    async (photos) => {
      const a = latest;
      const title = a.title.trim();
      if (!title) throw new Error('Please give the album a title.');
      const kept = a.photos.filter((p) => p.photo).map((p) => ({ photo: p.photo, caption: p.caption.trim() }));
      const cover = kept.some((p) => p.photo === a.cover) ? a.cover : '';
      const newId = isNew ? uniqueId(title, new Set((await gh.listDir(DIR)).map((f) => f.name.replace(/\.md$/, '')))) : id;
      const text = serializeFrontmatter(
        { title, location: a.location.trim(), date: /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date : '', description: a.description.trim(), cover, draft: a.draft, photos: kept },
        getStory(),
      );
      const changes: Change[] = [{ path: `${DIR}/${newId}.md`, text }, ...photos];
      if (isNew) changes.push(await galleryOrderChange(gh, (o) => [...o, newId!]));
      await gh.commit(changes, `${isNew ? 'Add' : 'Update'} album “${title}”`);
      onSaved();
      if (isNew) go(`#/albums/${encodeURIComponent(newId!)}`);
    },
    del,
  );

  const { host, unmount } = mount(AlbumEditor, {
    album,
    ctx: bar.ctx,
    onChange: (next: Album) => {
      latest = next;
      bar.ctx.onChange();
    },
    registerStory: (get: () => string) => (getStory = get),
  });

  return {
    title: isNew ? 'New album' : 'Edit album',
    jp: '写真',
    back: { href: '#/gallery', label: 'Gallery' },
    isDirty: bar.isDirty,
    destroy: unmount,
    body: host,
    footer: bar.footer,
  };
}

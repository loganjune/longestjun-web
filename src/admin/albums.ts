// Gallery albums: the list on the Gallery screen, and the album editor.
// Each album is src/content/albums/<id>.md: details and photos in the header, the optional
// travel story as the text below. Their order on the site is the "albums" list in gallery.json.
import type { GitHub, Change } from './github';
import { parseFrontmatter, serializeFrontmatter, uniqueId } from './frontmatter';
import { el, icon, iconButton, button, busy, toast, confirmBox, plural } from './ui';
import { renderFields, saveBar, showPicture, type Ctx } from './forms';
import { richText } from './richtext';
import type { View } from './app';

const DIR = 'src/content/albums';
const GALLERY = 'src/data/gallery.json';

type Photo = { photo: string; caption: string };
type Album = { id: string; title: string; location: string; description: string; cover: string; draft: boolean; photos: Photo[]; body: string };

function parseAlbum(id: string, text: string): Album {
  const { data, body } = parseFrontmatter(text);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const photos = Array.isArray(data.photos) ? data.photos.map((p: any) => ({ photo: str(p?.photo), caption: str(p?.caption) })) : [];
  return { id, title: str(data.title), location: str(data.location), description: str(data.description), cover: str(data.cover), draft: data.draft === true, photos, body };
}

async function loadAlbums(gh: GitHub): Promise<Album[]> {
  const files = (await gh.listDir(DIR)).filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  return Promise.all(files.map(async (f) => parseAlbum(f.name.slice(0, -3), (await gh.readText(f.path)) || '')));
}

const coverOf = (a: Pick<Album, 'cover' | 'photos'>) => a.cover || a.photos[0]?.photo || '';

/** The Albums list on the Gallery screen. Reordering edits gallery.json, so the Gallery screen's Save keeps it. */
export async function albumsPanel(gh: GitHub, gallery: any, ctx: Ctx): Promise<HTMLElement> {
  const albums = await loadAlbums(gh);
  const byId = new Map(albums.map((a) => [a.id, a]));
  // Keep the order list in step with the album files that exist.
  const order: string[] = (gallery.albums = [
    ...(gallery.albums || []).filter((id: string) => byId.has(id)),
    ...albums.map((a) => a.id).filter((id) => !(gallery.albums || []).includes(id)).sort(),
  ]);

  const list = el('ol', { cls: 'ed-items' });
  const move = (i: number, by: number) => {
    const j = i + by;
    [order[i], order[j]] = [order[j], order[i]];
    ctx.onChange();
    draw();
  };
  const draw = () =>
    list.replaceChildren(
      ...(order.length
        ? order.map((id, i) => {
            const a = byId.get(id)!;
            const thumb = el('span', { cls: 'ed-thumb' });
            showPicture(thumb, { photo: coverOf(a) });
            return el(
              'li',
              { cls: 'ed-item' },
              el(
                'div',
                { cls: 'ed-item-head' },
                el(
                  'a',
                  { href: `#/albums/${encodeURIComponent(id)}`, cls: 'ed-item-toggle' },
                  thumb,
                  el('span', { cls: 'ed-item-title' }, a.title || id, el('span', { cls: 'soft' }, ` · ${[a.location, plural(a.photos.length, 'photo')].filter(Boolean).join(' · ')}`), a.draft ? el('span', { cls: 'ed-tag' }, 'Draft') : null),
                  el('span', { cls: 'ed-chev' }, icon('chevron', 16)),
                ),
                el(
                  'div',
                  { cls: 'ed-row-tools' },
                  iconButton('up', 'Move album up', () => move(i, -1), { disabled: i === 0 }),
                  iconButton('down', 'Move album down', () => move(i, 1), { disabled: i === order.length - 1 }),
                ),
              ),
            );
          })
        : [el('li', { cls: 'soft ed-empty' }, 'No albums yet. Make one for a trip or a theme.')]),
    );
  draw();

  return el(
    'div',
    { cls: 'ed-field ed-albums' },
    el('div', { cls: 'ed-list-head' }, el('span', { cls: 'lab' }, 'Albums'), el('a', { href: '#/albums/new', cls: 'ed-btn solid' }, icon('plus', 16), ' New album')),
    el('span', { cls: 'ed-hint' }, 'Each album gets its own page, linked from the Gallery. The arrows set their order; Save to keep it.'),
    list,
  );
}

/** Adds or removes an album id in gallery.json's order list, as one more file for the same save. */
async function galleryOrderChange(gh: GitHub, edit: (order: string[]) => string[]): Promise<Change> {
  const gallery = JSON.parse((await gh.readText(GALLERY)) || '{"gallery":[]}');
  gallery.albums = edit(gallery.albums || []);
  return { path: GALLERY, text: JSON.stringify(gallery, null, 2) + '\n' };
}

export async function albumEditor(gh: GitHub, id: string | null, go: (hash: string) => void, onSaved: () => void): Promise<View> {
  const isNew = id === null;
  const path = isNew ? '' : `${DIR}/${id}.md`;
  let album: Album = { id: id || '', title: '', location: '', description: '', cover: '', draft: false, photos: [], body: '' };
  if (!isNew) {
    const text = await gh.readText(path);
    if (text === null) throw new Error('That album doesn’t exist any more.');
    album = parseAlbum(id, text);
  }

  const del = isNew
    ? null
    : button(
        'Delete album',
        async () => {
          if (!(await confirmBox('Delete this album?', `“${album.title || id}” and its page will be removed when you publish. Its photos stay in the repo’s history.`, 'Delete', true))) return;
          await busy(del!, 'Deleting…', async () => {
            await gh.commit([{ path, remove: true }, await galleryOrderChange(gh, (o) => o.filter((x) => x !== id))], `Delete album “${album.title || id}”`);
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
      album.title = title.value.trim();
      if (!album.title) throw new Error('Please give the album a title.');
      const kept = album.photos.filter((p) => p.photo);
      const cover = kept.some((p) => p.photo === album.cover) ? album.cover : '';
      const newId = isNew ? uniqueId(album.title, new Set((await gh.listDir(DIR)).map((f) => f.name.replace(/\.md$/, '')))) : id;
      const text = serializeFrontmatter(
        { title: album.title, location: location.value.trim(), description: description.value.trim(), cover, draft: draft.checked, photos: kept },
        story.getMarkdown(),
      );
      const changes: Change[] = [{ path: `${DIR}/${newId}.md`, text }, ...photos];
      if (isNew) changes.push(await galleryOrderChange(gh, (o) => [...o, newId!]));
      await gh.commit(changes, `${isNew ? 'Add' : 'Update'} album “${album.title}”`);
      onSaved();
      if (isNew) go(`#/albums/${encodeURIComponent(newId!)}`);
    },
    del,
  );

  // Any change to the photos also redraws the cover choices.
  const ctx: Ctx = { ...bar.ctx, onChange: () => (bar.ctx.onChange(), drawCovers()) };

  const title = el('input', { cls: 'ed-title-input', value: album.title, placeholder: 'Album title', 'aria-label': 'Album title' });
  const location = el('input', { value: album.location, placeholder: 'Lisbon, Portugal' });
  const description = el('textarea', { rows: 2, placeholder: 'A line or two about the album.' });
  description.value = album.description;
  const draft = el('input', { type: 'checkbox', checked: album.draft });
  for (const i of [title, location, description]) i.addEventListener('input', bar.ctx.onChange);
  draft.addEventListener('change', bar.ctx.onChange);

  const photosField = renderFields(
    [
      {
        kind: 'list',
        key: 'photos',
        label: 'Photos',
        itemName: 'Photo',
        thumbs: true,
        hint: 'Add several at once. Captions are optional; the arrows set the order.',
        summary: (p) => p.caption || (p.photo ? 'No caption' : 'No photo yet'),
        newItem: () => ({ photo: '', caption: '' }),
        bulkPhotos: { folder: 'albums', make: (photo) => ({ photo, caption: '' }) },
        fields: [
          { kind: 'text', key: 'caption', label: 'Caption' },
          { kind: 'picture', folder: 'albums', label: 'Photo', photoOnly: true },
        ],
      },
    ],
    album,
    ctx,
  );

  const covers = el('div', { cls: 'ed-covers', role: 'radiogroup', 'aria-label': 'Cover photo' });
  function drawCovers() {
    const current = coverOf(album);
    const withPhoto = album.photos.filter((p) => p.photo);
    covers.replaceChildren(
      ...(withPhoto.length
        ? withPhoto.map((p, i) => {
            const b = el('button', { type: 'button', cls: 'ed-cover', role: 'radio', 'aria-checked': String(p.photo === current), 'aria-label': p.caption || `Photo ${i + 1}` });
            showPicture(b, p);
            b.addEventListener('click', () => {
              album.cover = p.photo;
              bar.ctx.onChange();
              drawCovers();
            });
            return b;
          })
        : [el('p', { cls: 'soft' }, 'Add photos first, then pick one for the cover.')]),
    );
  }
  drawCovers();

  const story = richText(album.body, ctx, 'albums', 'Travel story', 'Write about the trip (optional)…');

  return {
    title: isNew ? 'New album' : 'Edit album',
    jp: '写真',
    back: { href: '#/gallery', label: 'Gallery' },
    isDirty: bar.isDirty,
    destroy: story.destroy,
    body: el(
      'div',
      { cls: 'ed-note' },
      title,
      el(
        'div',
        { cls: 'ed-note-meta' },
        el('label', { cls: 'ed-field' }, el('span', { cls: 'lab' }, 'Location'), location),
        el('label', { cls: 'ed-field ed-grow' }, el('span', { cls: 'lab' }, 'Short description'), description),
        el('label', { cls: 'ed-check' }, draft, el('span', {}, el('span', { cls: 'lab' }, 'Draft'), el('span', { cls: 'ed-hint' }, 'Hidden from the live site'))),
      ),
      photosField,
      el('div', { cls: 'ed-field' }, el('span', { cls: 'lab' }, 'Cover'), el('span', { cls: 'ed-hint' }, 'Shown on the Gallery page. If you don’t pick one, the first photo is used.'), covers),
      el('div', { cls: 'ed-field' }, el('span', { cls: 'lab' }, 'Travel story'), el('span', { cls: 'ed-hint' }, 'Optional. Shown on the album’s page above the photos.'), story.element),
    ),
    footer: bar.footer,
  };
}

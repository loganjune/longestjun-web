// Notes: the list, and the word-processor style editor. Notes are saved as Markdown files in
// src/content/notes/, exactly like before, so the site and the classic editor read them unchanged.
import type { GitHub } from './github';
import { parseFrontmatter, serializeFrontmatter, uniqueId } from './frontmatter';
import { el, icon, button, busy, toast, confirmBox, row, rowList } from './ui';
import { saveBar } from './forms';
import { richText } from './richtext';
import type { View } from './app';

const DIR = 'src/content/notes';

type NoteMeta = { title: string; date: string; description: string; draft: boolean };

function parseNote(text: string): { meta: NoteMeta; body: string } {
  const { data, body } = parseFrontmatter(text);
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
  return { meta: { title: str(data.title), date: str(data.date).slice(0, 10), description: str(data.description), draft: data.draft === true }, body };
}

type NoteRow = { id: string; path: string; meta: NoteMeta };

async function loadNotes(gh: GitHub): Promise<NoteRow[]> {
  const files = (await gh.listDir(DIR)).filter((f) => f.type === 'file' && /\.mdx?$/.test(f.name));
  const rows = await Promise.all(
    files.map(async (f) => {
      const text = (await gh.readText(f.path)) || '';
      return { id: f.name.replace(/\.mdx?$/, ''), path: f.path, meta: parseNote(text).meta };
    }),
  );
  return rows.sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.meta.title.localeCompare(b.meta.title));
}

function fmtDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || 'No date';
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export async function notesList(gh: GitHub): Promise<View> {
  const notes = await loadNotes(gh);
  const newBtn = el('a', { href: '#/notes/new', cls: 'ed-btn solid' }, icon('plus', 16), ' New note');
  return {
    title: 'Notes',
    jp: '記録',
    intro: 'Short writing. Drafts are saved but stay off the live site until you untick Draft.',
    actions: [newBtn],
    body: rowList(
      notes.map((n) => row(fmtDate(n.meta.date), [n.meta.title || n.id, n.meta.draft && el('span', { cls: 'ed-tag' }, 'Draft')], `#/notes/${encodeURIComponent(n.id)}`)),
      'No notes yet. Start one with New note.',
    ),
  };
}

export async function noteEditor(gh: GitHub, id: string | null, go: (hash: string) => void, onSaved: () => void): Promise<View> {
  const isNew = id === null;
  let path = '';
  let meta: NoteMeta = { title: '', date: new Date().toLocaleDateString('en-CA'), description: '', draft: true };
  let body = '';
  if (!isNew) {
    // Notes are .md, but the site also accepts .mdx, so look for either.
    let text: string | null = null;
    for (const ext of ['md', 'mdx']) {
      path = `${DIR}/${id}.${ext}`;
      if ((text = await gh.readText(path)) !== null) break;
    }
    if (text === null) throw new Error('That note doesn’t exist any more.');
    ({ meta, body } = parseNote(text));
  }

  const del = isNew
    ? null
    : button(
        'Delete note',
        async () => {
          if (!(await confirmBox('Delete this note?', `“${title.value || id}” will be removed when you publish. Until then you can still discard it.`, 'Delete', true))) return;
          await busy(del!, 'Deleting…', async () => {
            await gh.commit([{ path, remove: true }], `Delete note “${title.value || id}”`);
            toast('Note deleted from drafts.');
            onSaved();
            go('#/notes');
          });
        },
        'ed-btn danger quiet',
      );

  const bar = saveBar(
    isNew ? 'Not saved yet' : 'Saved',
    async (photos) => {
      const m: NoteMeta = { title: title.value.trim(), date: date.value, description: desc.value.trim(), draft: draft.checked };
      if (!m.title) throw new Error('Please give the note a title.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) throw new Error('Please pick a date.');
      let target = path;
      let newId = id;
      if (isNew) {
        newId = uniqueId(m.title, new Set((await gh.listDir(DIR)).map((f) => f.name.replace(/\.mdx?$/, ''))));
        target = `${DIR}/${newId}.md`;
      }
      await gh.commit([{ path: target, text: serializeFrontmatter(m, doc.getMarkdown()) }, ...photos], `${isNew ? 'Add' : 'Update'} note “${m.title}”`);
      onSaved();
      if (isNew) go(`#/notes/${encodeURIComponent(newId!)}`);
    },
    del,
  );
  const changed = bar.ctx.onChange;

  const title = el('input', { cls: 'ed-title-input', value: meta.title, placeholder: 'Title', 'aria-label': 'Title' });
  const date = el('input', { type: 'date', value: meta.date, 'aria-label': 'Date' });
  const desc = el('input', { value: meta.description, placeholder: 'Optional. Shown under the title in lists.' });
  const draft = el('input', { type: 'checkbox', checked: meta.draft });
  for (const i of [title, date, desc]) i.addEventListener('input', changed);
  draft.addEventListener('change', changed);

  const doc = richText(body, bar.ctx, 'notes', 'Note text');

  return {
    title: isNew ? 'New note' : 'Edit note',
    jp: '記録',
    back: { href: '#/notes', label: 'All notes' },
    isDirty: bar.isDirty,
    destroy: doc.destroy,
    body: el(
      'div',
      { cls: 'ed-note' },
      title,
      el(
        'div',
        { cls: 'ed-note-meta' },
        el('label', { cls: 'ed-field' }, el('span', { cls: 'lab' }, 'Date'), date),
        el('label', { cls: 'ed-field ed-grow' }, el('span', { cls: 'lab' }, 'Short description'), desc),
        el('label', { cls: 'ed-check' }, draft, el('span', {}, el('span', { cls: 'lab' }, 'Draft'), el('span', { cls: 'ed-hint' }, 'Hidden from the live site'))),
      ),
      doc.element,
    ),
    footer: bar.footer,
  };
}

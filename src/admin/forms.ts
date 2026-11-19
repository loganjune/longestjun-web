// Builds editing forms from a short description of each section (see sections.ts).
// Forms change the data object in place and call `onChange` so the screen knows there are unsaved edits.
import { el, icon, iconButton, button, busy, toast, plural } from './ui';
import { preparePhoto, photoName, showImage, rememberPreview } from './images';
import type { Change } from './github';
import { scene, SCENES } from '../lib/scene';
import { sortable, moveItem } from './sortable';

export type Field =
  | { kind: 'text' | 'textarea'; key: string; label: string; hint?: string; placeholder?: string; big?: boolean }
  | { kind: 'select'; key: string; label: string; options: string[]; hint?: string }
  | { kind: 'picture'; label?: string; folder: string; hint?: string; photoOnly?: boolean }
  | { kind: 'paragraphs'; key: string; label: string; hint?: string }
  | { kind: 'object'; key: string; label: string; fields: Field[] }
  | {
      kind: 'list';
      key: string;
      label: string;
      itemName: string;
      fields: Field[];
      summary: (item: any) => string;
      newItem: () => any;
      hint?: string;
      thumbs?: boolean;
      bulkPhotos?: { folder: string; make: (photo: string) => any };
    };

/** Photos chosen in this form, waiting to be uploaded with the next Save. Key: repo path. */
export type Uploads = Map<string, Uint8Array>;

export type Ctx = { uploads: Uploads; onChange: () => void };

/**
 * The Save bar at the bottom of an editing screen, and its "unsaved changes" tracking.
 * `save` gets the photos waiting to be uploaded, and should commit them with the screen's own file.
 * `extra` is shown before the Save button (e.g. Delete).
 */
export function saveBar(initial: string, save: (photos: Change[]) => Promise<void>, extra: HTMLElement | null = null) {
  const uploads: Uploads = new Map();
  let dirty = false;
  const status = el('span', { cls: 'ed-status soft' }, initial);
  const ctx: Ctx = {
    uploads,
    onChange: () => {
      dirty = true;
      status.textContent = 'Unsaved changes';
    },
  };
  const btn = button('Save', () =>
    busy(btn, 'Saving…', async () => {
      await save([...uploads].map(([path, bytes]) => ({ path, bytes })));
      uploads.clear();
      dirty = false;
      status.textContent = 'Saved. Publish to make it live.';
      toast('Saved to drafts.');
    }),
  'ed-btn solid');
  return { ctx, isDirty: () => dirty, footer: el('div', { cls: 'ed-savebar' }, status, el('span', { cls: 'ed-actions' }, extra, btn)) };
}

export function renderFields(fields: Field[], data: any, ctx: Ctx): HTMLElement {
  const box = el('div', { cls: 'ed-fields' });
  for (const f of fields) box.append(renderField(f, data, ctx));
  return box;
}

function renderField(f: Field, data: any, ctx: Ctx): HTMLElement {
  switch (f.kind) {
    case 'text':
    case 'textarea': {
      const input = f.kind === 'text' ? el('input', { placeholder: f.placeholder || '' }) : el('textarea', { rows: f.big ? 5 : 3, placeholder: f.placeholder || '' });
      input.value = data[f.key] ?? '';
      input.addEventListener('input', () => {
        data[f.key] = input.value;
        ctx.onChange();
      });
      return field(f.label, input, f.hint);
    }
    case 'select': {
      const sel = el('select', {}, ...f.options.map((o) => el('option', { value: o, selected: data[f.key] === o }, o)));
      sel.addEventListener('change', () => {
        data[f.key] = sel.value;
        ctx.onChange();
      });
      return field(f.label, sel, f.hint);
    }
    case 'paragraphs': {
      const list: string[] = (data[f.key] ||= []);
      const wrap = el('div', { cls: 'ed-paras' });
      const draw = () => {
        wrap.replaceChildren(
          ...list.map((p, i) => {
            const ta = el('textarea', { rows: 4, 'aria-label': `Paragraph ${i + 1}` });
            ta.value = p;
            ta.addEventListener('input', () => {
              list[i] = ta.value;
              ctx.onChange();
            });
            return el(
              'div',
              { cls: 'ed-para' },
              grip(`Paragraph ${i + 1}`),
              ta,
              el(
                'div',
                { cls: 'ed-row-tools' },
                iconButton('trash', 'Remove paragraph', () => {
                  list.splice(i, 1);
                  draw();
                  ctx.onChange();
                }),
              ),
            );
          }),
          button('Add a paragraph', () => {
            list.push('');
            draw();
            ctx.onChange();
          }, 'ed-btn quiet'),
        );
      };
      draw();
      makeSortable(wrap, '.ed-para', list, draw, ctx);
      return field(f.label, wrap, f.hint, true);
    }
    case 'object': {
      data[f.key] ||= {};
      return el('fieldset', { cls: 'ed-group' }, el('legend', { cls: 'lab' }, f.label), renderFields(f.fields, data[f.key], ctx));
    }
    case 'picture':
      return renderPicture(f, data, ctx);
    case 'list':
      return renderList(f, data, ctx);
  }
}

function field(label: string, control: HTMLElement, hint?: string, group = false) {
  return el(group ? 'div' : 'label', { cls: 'ed-field' }, el('span', { cls: 'lab' }, label), control, hint ? el('span', { cls: 'ed-hint' }, hint) : null);
}

/** The grip handle: drag it to reorder, or focus it and use the arrow keys. */
function grip(label: string) {
  return el('button', { type: 'button', cls: 'ed-icon ed-grip', 'aria-label': `${label}. Drag, or use the arrow keys, to reorder.`, title: 'Drag to reorder' }, icon('grip'));
}

/** Turns on drag-and-drop for a list that redraws itself from `list`. */
function makeSortable(container: HTMLElement, items: string, list: any[], redraw: () => void, ctx: Ctx) {
  sortable({
    container,
    items,
    handle: '.ed-grip',
    onMove: (from, to) => {
      moveItem(list, from, to);
      redraw();
      ctx.onChange();
    },
  });
}

/** Upload one photo: shrink it, remember it for the next Save, and return its site path. */
export async function addPhoto(file: File, folder: string, ctx: Ctx): Promise<string> {
  const p = await preparePhoto(file);
  const name = photoName(file.name, p.ext);
  const sitePath = `/images/${folder}/${name}`;
  ctx.uploads.set(`public${sitePath}`, p.bytes);
  rememberPreview(sitePath, p.previewUrl);
  return sitePath;
}

function picker(multiple: boolean, onFiles: (files: File[]) => void) {
  const input = el('input', { type: 'file', accept: 'image/*', multiple, cls: 'ed-file' });
  input.addEventListener('change', () => {
    const files = [...(input.files || [])];
    input.value = '';
    if (files.length) onFiles(files);
  });
  return input;
}

/** Fills `box` with an item's photo, or its built-in drawing. */
export function showPicture(box: HTMLElement, item: any) {
  if (item.photo) {
    const img = el('img', { alt: '' });
    showImage(img, item.photo);
    box.replaceChildren(img);
  } else {
    box.innerHTML = scene(item.picture || 'sea'); // built-in drawing: our own SVG, not user input
  }
}

/** A picture is either an uploaded photo (`photo`) or one of the built-in drawings (`picture`). */
function renderPicture(f: Extract<Field, { kind: 'picture' }>, data: any, ctx: Ctx): HTMLElement {
  const preview = el('div', { cls: 'ed-pic' });
  const tools = el('div', { cls: 'ed-pic-tools' });
  const draw = () => {
    showPicture(preview, data);
    const file = picker(false, async ([file]) => {
      try {
        data.photo = await addPhoto(file, f.folder, ctx);
        ctx.onChange();
        draw();
      } catch (e) {
        toast((e as Error).message, 'error');
      }
    });
    const sel = el('select', { 'aria-label': 'Drawing' }, ...SCENES.map((s) => el('option', { value: s, selected: (data.picture || 'sea') === s }, s)));
    sel.addEventListener('change', () => {
      data.picture = sel.value;
      ctx.onChange();
      draw();
    });
    const upload = el('label', { cls: 'ed-btn' }, icon('photo', 16), data.photo ? ' Replace photo' : ' Upload photo', file);
    if (f.photoOnly) return tools.replaceChildren(upload);
    tools.replaceChildren(
      upload,
      data.photo
        ? button('Use drawing instead', () => {
            data.photo = '';
            ctx.onChange();
            draw();
          }, 'ed-btn quiet')
        : el('label', { cls: 'ed-inline' }, el('span', { cls: 'lab' }, 'Drawing'), sel),
    );
  };
  draw();
  return field(f.label || 'Picture', el('div', { cls: 'ed-picbox' }, preview, tools), f.hint, true);
}

function renderList(f: Extract<Field, { kind: 'list' }>, data: any, ctx: Ctx): HTMLElement {
  const list: any[] = (data[f.key] ||= []);
  const box = el('ol', { cls: 'ed-items' });
  const open = new Set<any>();
  const name = f.itemName.toLowerCase();
  const title = (item: any) => f.summary(item) || `New ${name}`;

  const draw = () => {
    box.replaceChildren(
      ...list.map((item, i) => {
        const isOpen = open.has(item);
        const thumb = f.thumbs ? el('span', { cls: 'ed-thumb' }) : null;
        if (thumb) showPicture(thumb, item);
        const head = el(
          'div',
          { cls: 'ed-item-head' },
          grip(title(item)),
          el(
            'button',
            {
              type: 'button',
              cls: 'ed-item-toggle',
              'aria-expanded': String(isOpen),
              on: {
                click: () => {
                  isOpen ? open.delete(item) : open.add(item);
                  draw();
                },
              },
            },
            thumb,
            el('span', { cls: 'ed-item-title' }, title(item)),
            el('span', { cls: `ed-chev${isOpen ? ' open' : ''}` }, icon('chevron', 16)),
          ),
          el(
            'div',
            { cls: 'ed-row-tools' },
            iconButton('trash', `Remove ${name}`, () => {
              list.splice(i, 1);
              open.delete(item);
              draw();
              ctx.onChange();
              toast(`${f.itemName} removed. Save to keep this change.`);
            }),
          ),
        );
        const body = isOpen ? el('div', { cls: 'ed-item-body' }, renderFields(f.fields, item, { ...ctx, onChange: () => (ctx.onChange(), refreshTitle()) })) : null;
        const li = el('li', { cls: `ed-item${isOpen ? ' open' : ''}` }, head, body);
        const refreshTitle = () => {
          const t = li.querySelector('.ed-item-title');
          if (t) t.textContent = title(item);
        };
        return li;
      }),
    );
  };

  const addBtn = button(`Add ${name}`, () => {
    const item = f.newItem();
    list.push(item);
    open.add(item);
    draw();
    ctx.onChange();
    box.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 'ed-btn');
  addBtn.prepend(icon('plus', 16), ' ');

  const bulk = f.bulkPhotos
    ? el(
        'label',
        { cls: 'ed-btn solid' },
        icon('photo', 16),
        ' Add photos',
        picker(true, async (files) => {
          for (const file of files) {
            try {
              const photo = await addPhoto(file, f.bulkPhotos!.folder, ctx);
              list.push(f.bulkPhotos!.make(photo));
            } catch (e) {
              toast((e as Error).message, 'error');
            }
          }
          draw();
          ctx.onChange();
          toast(`${plural(files.length, 'photo')} added. Add captions, then Save.`);
        }),
      )
    : null;

  draw();
  makeSortable(box, '.ed-item', list, draw, ctx);
  return el(
    'div',
    { cls: 'ed-field' },
    el('div', { cls: 'ed-list-head' }, el('span', { cls: 'lab' }, f.label), el('span', { cls: 'ed-actions' }, bulk, addBtn)),
    f.hint ? el('span', { cls: 'ed-hint' }, f.hint) : null,
    box,
  );
}

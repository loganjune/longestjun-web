// Crop and rotate a photo before it's saved. Opens as a dialog; resolves with the edited photo,
// or null if cancelled. Drag inside the box to move it, drag a corner to resize it, pick a shape
// to fix its proportions, rotate in quarter turns, and straighten a tilted photo by up to 15°. Arrow keys nudge the box when it's focused.
import { el, button, icon } from './ui';
import { decodePhoto, fitCanvas, encodeCanvas, type Prepared } from './images';

type Box = { x: number; y: number; w: number; h: number }; // fractions (0–1) of the picture
const SHAPES: { label: string; ratio: number | null | 'original' }[] = [
  { label: 'Free', ratio: null },
  { label: 'Original', ratio: 'original' },
  { label: 'Square', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
];
const MIN = 0.05; // smallest box, as a fraction of the picture

export async function cropPhoto(source: Blob): Promise<Prepared | null> {
  const bitmap = await decodePhoto(source);
  // Work on a copy no larger than the final size, so rotating and cropping stay quick.
  const original = fitCanvas(bitmap, bitmap.width, bitmap.height);
  bitmap.close();

  let turns = 0; // quarter turns clockwise
  let angle = 0; // fine straightening, in degrees (−15 to 15)
  let work = original;
  let box: Box = { x: 0, y: 0, w: 1, h: 1 };
  let ratio: number | null = null; // width / height of the box in pixels, or free

  return new Promise((resolve) => {
    const dlg = el('dialog', { cls: 'ed-dialog crop', 'aria-label': 'Crop and rotate' });
    const stage = el('div', { cls: 'crop-stage' });
    const frame = el('div', { cls: 'crop-frame', tabindex: '0', 'aria-label': 'Crop area. Drag to move, or use the arrow keys.' });
    for (const c of ['nw', 'ne', 'sw', 'se']) frame.append(el('span', { cls: `crop-handle ${c}`, 'data-corner': c }));
    stage.append(work, frame);

    const close = (v: Prepared | null) => {
      dlg.close();
      dlg.remove();
      resolve(v);
    };

    const draw = () => {
      Object.assign(frame.style, { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` });
    };

    /** The largest centred box with the chosen shape. */
    const fitShape = () => {
      if (!ratio) return;
      const r = ratio / (work.width / work.height); // shape in fractions of this picture
      box = r > 1 ? { w: 1, h: 1 / r, x: 0, y: (1 - 1 / r) / 2 } : { w: r, h: 1, x: (1 - r) / 2, y: 0 };
    };

    /**
     * Redraws the picture turned by quarter turns plus the fine straightening angle. When
     * straightened, it's enlarged just enough that no empty corners show.
     */
    const render = () => {
      const side = turns % 2 === 1;
      const W = side ? original.height : original.width;
      const H = side ? original.width : original.height;
      const t = (Math.abs(angle) * Math.PI) / 180;
      const zoom = Math.cos(t) + Math.max(W / H, H / W) * Math.sin(t);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const x = c.getContext('2d')!;
      x.translate(W / 2, H / 2);
      x.rotate((turns * Math.PI) / 2 + (angle * Math.PI) / 180);
      x.scale(zoom, zoom);
      x.drawImage(original, -original.width / 2, -original.height / 2);
      work.replaceWith(c);
      work = c;
    };

    const rotate = (by: number) => {
      turns = (turns + by + 4) % 4;
      render();
      box = { x: 0, y: 0, w: 1, h: 1 };
      fitShape();
      draw();
    };

    const straighten = el('input', { type: 'range', min: '-15', max: '15', step: '0.5', value: '0', 'aria-label': 'Straighten' });
    const angleLabel = el('span', { cls: 'crop-angle' }, '0°');
    straighten.addEventListener('input', () => {
      angle = Number(straighten.value);
      angleLabel.textContent = `${angle > 0 ? '+' : ''}${angle}°`;
      render(); // the crop box stays where it is while straightening
    });

    // Dragging: move the whole box, or resize from a corner.
    let drag: { mode: string; startX: number; startY: number; start: Box } | null = null;
    frame.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const corner = (e.target as HTMLElement).dataset.corner || 'move';
      drag = { mode: corner, startX: e.clientX, startY: e.clientY, start: { ...box } };
      frame.setPointerCapture(e.pointerId);
    });
    frame.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / r.width;
      const dy = (e.clientY - drag.startY) / r.height;
      const s = drag.start;
      if (drag.mode === 'move') {
        box = { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
      } else {
        const west = drag.mode.includes('w');
        const north = drag.mode.includes('n');
        // The opposite corner stays put.
        const ax = west ? s.x + s.w : s.x;
        const ay = north ? s.y + s.h : s.y;
        let w = clamp(west ? s.w - dx : s.w + dx, MIN, west ? ax : 1 - ax);
        let h = clamp(north ? s.h - dy : s.h + dy, MIN, north ? ay : 1 - ay);
        if (ratio) {
          const r2 = ratio / (work.width / work.height);
          // Follow whichever side moved more, then make sure it still fits.
          if (w / h > r2) w = h * r2;
          else h = w / r2;
          const maxW = west ? ax : 1 - ax;
          const maxH = north ? ay : 1 - ay;
          if (w > maxW) (w = maxW), (h = w / r2);
          if (h > maxH) (h = maxH), (w = h * r2);
        }
        box = { w, h, x: west ? ax - w : ax, y: north ? ay - h : ay };
      }
      draw();
    });
    const end = () => (drag = null);
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    frame.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      box = { ...box, x: clamp(box.x + d[0], 0, 1 - box.w), y: clamp(box.y + d[1], 0, 1 - box.h) };
      draw();
    });

    const shapeButtons = SHAPES.map((sh) => {
      const b = button(sh.label, () => {
        ratio = sh.ratio === 'original' ? original.width / original.height : sh.ratio;
        if (sh.ratio === 'original' && turns % 2 === 1) ratio = original.height / original.width;
        shapeButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        if (ratio) fitShape();
        else box = { x: 0, y: 0, w: 1, h: 1 };
        draw();
      }, 'crop-shape');
      b.setAttribute('aria-pressed', String(sh.ratio === null));
      return b;
    });

    const apply = button('Apply', async () => {
      apply.disabled = true;
      apply.textContent = 'Saving…';
      const sx = Math.round(box.x * work.width);
      const sy = Math.round(box.y * work.height);
      const sw = Math.max(1, Math.round(box.w * work.width));
      const sh = Math.max(1, Math.round(box.h * work.height));
      const out = document.createElement('canvas');
      out.width = sw;
      out.height = sh;
      out.getContext('2d')!.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
      close(await encodeCanvas(out));
    }, 'ed-btn solid');

    const turn = (dir: number, label: string, name: string) => {
      const b = el('button', { type: 'button', cls: 'ed-icon', 'aria-label': label, title: label }, icon(name));
      b.addEventListener('click', () => rotate(dir));
      return b;
    };

    dlg.append(
      el('h2', { cls: 'ed-dialog-title' }, 'Crop and rotate'),
      stage,
      el('label', { cls: 'crop-straighten' }, el('span', { cls: 'lab' }, 'Straighten'), straighten, angleLabel),
      el('div', { cls: 'crop-tools' }, el('div', { cls: 'crop-shapes', role: 'group', 'aria-label': 'Shape' }, ...shapeButtons), el('div', { cls: 'crop-turns' }, turn(-1, 'Rotate left', 'undo'), turn(1, 'Rotate right', 'redo'))),
      el(
        'div',
        { cls: 'ed-actions' },
        button('Cancel', () => close(null), 'ed-btn quiet'),
        button('Reset', () => {
          angle = 0;
          straighten.value = '0';
          angleLabel.textContent = '0°';
          turns = 1;
          ratio = null;
          shapeButtons.forEach((x, i) => x.setAttribute('aria-pressed', String(i === 0)));
          rotate(-1);
        }, 'ed-btn quiet'),
        apply,
      ),
    );
    dlg.addEventListener('cancel', () => close(null));
    document.body.append(dlg);
    dlg.showModal();
    draw();
    frame.focus();
  });
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

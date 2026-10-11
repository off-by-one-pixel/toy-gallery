import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_LABELS } from '../../../test/labels';
import { Shape, useToyStore } from '../../toyMachine';
import { EditorConfigContext } from '../editorConfig';
import EditorRender from './EditorRender';
import type { ReferenceImage } from './referenceImage';

vi.mock('../../util/svgGeometry', () => ({
  localFromClient: (_target: unknown, x: number, y: number) => ({ x, y }),
}));

const CONFIG = { unit: { id: 'mm', factor: 1, decimals: 0 }, labels: TEST_LABELS, palette: [] };
const STYLE = { borderWidth: 2, borderColor: '#000', color: 'lightblue' };

const Harness = ({ initialImage }: { initialImage: ReferenceImage | null }) => {
  const toy = useToyStore();
  const [image, setImage] = useState(initialImage);
  return (
    <EditorConfigContext.Provider value={CONFIG}>
      <EditorRender toy={toy} style={STYLE} referenceImage={image} onReferenceImageChange={setImage} />
      <output data-testid="image">{JSON.stringify(image)}</output>
    </EditorConfigContext.Provider>
  );
};

const currentImage = (): ReferenceImage | null => JSON.parse(screen.getByTestId('image').textContent ?? 'null');

type Guides = { total?: number; insertable?: number; size?: number };

const renderEditor = (guides: Guides = {}, image: ReferenceImage | null = null) => {
  useToyStore.getState().hydrate({
    sections: [
      { id: 1, height: 60, diameter: 30 },
      { id: 2, height: 40, diameter: 40 },
      { id: 3, height: 20, diameter: 50 },
    ],
    topShape: Shape.FLAT,
    bottomShape: Shape.FLAT,
    knownTotalMm: guides.total ?? null,
    insertableLengthMm: guides.insertable ?? null,
    knownSizeMm: guides.size ?? null,
  });
  render(<Harness initialImage={image} />);
};

const attr = (el: Element, name: string) => Number(el.getAttribute(name));
const band = (i: number) => document.querySelectorAll('.toy-editor-handle-boundary')[i];
const bandY = (i: number) => attr(band(i), 'y') + attr(band(i), 'height') / 2;
const pxPerMm = () => (bandY(1) - bandY(0)) / useToyStore.getState().sections[1].height;
const heights = () => useToyStore.getState().sections.map((s) => +s.height.toFixed(3));
const diameters = () => useToyStore.getState().sections.map((s) => +s.diameter.toFixed(3));

const press = (el: Element, x: number, y: number, pointerId = 1) => {
  const notPrevented = fireEvent.pointerDown(el, { pointerId, clientX: x, clientY: y });
  return {
    notPrevented,
    moveTo: (dx: number, dy: number, id = pointerId) =>
      fireEvent.pointerMove(el, { pointerId: id, clientX: x + dx, clientY: y + dy }),
    release: () => fireEvent.pointerUp(el, { pointerId }),
  };
};

const pressBand = (i: number) => press(band(i), attr(band(i), 'x') + 5, bandY(i));

const dragBandBy = (i: number, mm: number) => {
  const k = pxPerMm();
  const drag = pressBand(i);
  drag.moveTo(0, mm * k);
  drag.release();
};

describe('EditorRender drag handles', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 900, 700));
  });

  it('moves height between the sections on either side of an inner boundary', () => {
    renderEditor();
    const k = pxPerMm();
    const drag = pressBand(0);
    expect(drag.notPrevented).toBe(false);
    drag.moveTo(0, 10 * k);
    expect(heights()).toEqual([70, 30, 20]);
    drag.moveTo(0, -15 * k);
    drag.release();
    expect(heights()).toEqual([45, 55, 20]);
  });

  it('keeps an inner boundary on the pointer after it hits the minimum section height', () => {
    renderEditor();
    const k = pxPerMm();
    const drag = pressBand(0);
    drag.moveTo(0, 60 * k);
    expect(heights()).toEqual([99, 1, 20]);
    drag.moveTo(0, 20 * k);
    drag.release();
    expect(heights()).toEqual([80, 20, 20]);
  });

  it('drags the bottom as the boundary below the last section with the frame frozen', () => {
    renderEditor();
    const k = pxPerMm();
    const topBandY = bandY(0);
    const pointerY = bandY(2) + 15 * k;
    const drag = pressBand(2);
    drag.moveTo(0, 15 * k);
    expect(heights()).toEqual([60, 40, 35]);
    expect(bandY(0)).toBe(topBandY);
    expect(bandY(2)).toBeCloseTo(pointerY);
    drag.release();
    expect(bandY(0)).not.toBe(topBandY);
  });

  it('never shrinks the dragged section below 1 mm', () => {
    renderEditor();
    dragBandBy(2, -200);
    expect(heights()).toEqual([60, 40, 1]);
  });

  it('snaps boundaries to the insertable and total guides', () => {
    renderEditor({ total: 130, insertable: 95 });
    dragBandBy(2, 11.5);
    expect(heights()).toEqual([60, 40, 30]);
    dragBandBy(0, 34);
    expect(heights()).toEqual([95, 5, 30]);
  });

  it('snaps the bottom to the nearer of two close guides', () => {
    renderEditor({ total: 121, insertable: 119.5 });
    dragBandBy(2, -0.2);
    expect(heights()).toEqual([60, 40, 19.5]);
  });

  it('snaps an inner boundary to the nearer of two close guides', () => {
    renderEditor({ total: 101.5, insertable: 100.3 });
    dragBandBy(1, 1.3);
    expect(heights()).toEqual([60, 41.5, 18.5]);
  });

  it('drags a diameter handle and snaps it to the known size', () => {
    renderEditor({ size: 41 });
    const k = pxPerMm();
    const handle = () => document.querySelectorAll('.toy-editor-handle-diameter')[1];
    const widen = press(handle(), attr(handle(), 'cx'), attr(handle(), 'cy'));
    widen.moveTo(3 * k, 0);
    widen.release();
    expect(diameters()).toEqual([30, 46, 50]);
    const narrow = press(handle(), attr(handle(), 'cx'), attr(handle(), 'cy'));
    narrow.moveTo(-2.3 * k, 0);
    narrow.release();
    expect(diameters()).toEqual([30, 41, 50]);
  });

  it('follows only the pointer that started the drag until it is released or cancelled', () => {
    renderEditor();
    const k = pxPerMm();
    const drag = pressBand(0);
    drag.moveTo(0, 10 * k, 2);
    expect(heights()).toEqual([60, 40, 20]);
    fireEvent.pointerUp(band(0), { pointerId: 2 });
    drag.moveTo(0, 10 * k);
    expect(heights()).toEqual([70, 30, 20]);
    fireEvent.pointerCancel(band(0), { pointerId: 1 });
    drag.moveTo(0, 20 * k);
    expect(heights()).toEqual([70, 30, 20]);
  });

  it('moves and resizes the reference image with the frame frozen', () => {
    renderEditor({}, { url: 'data:,', aspect: 2, xMm: -20, yMm: 0, widthMm: 40 });
    const k = pxPerMm();
    const topBandY = bandY(0);
    const image = document.querySelector('image.toy-editor-reference')!;
    const move = press(image, attr(image, 'x') + 10, attr(image, 'y') + 10);
    move.moveTo(10 * k, 5 * k);
    expect(bandY(0)).toBe(topBandY);
    move.release();
    expect(currentImage()).toMatchObject({ xMm: expect.closeTo(-10), yMm: expect.closeTo(5), widthMm: 40 });

    const handle = document.querySelector('.toy-editor-reference-handle')!;
    const resize = press(handle, attr(handle, 'cx'), attr(handle, 'cy'));
    resize.moveTo(10 * pxPerMm(), 0);
    resize.release();
    expect(currentImage()).toMatchObject({
      xMm: expect.closeTo(-10),
      yMm: expect.closeTo(5),
      widthMm: expect.closeTo(50),
    });
  });
});

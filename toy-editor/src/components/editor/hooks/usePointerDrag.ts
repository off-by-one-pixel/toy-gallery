import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import { localFromClient } from '../../../util/svgGeometry';

export type Point = { x: number; y: number };

type SvgPointerEvent = ReactPointerEvent<SVGElement>;

type DragSpec<A extends unknown[], T> = {
  begin: (point: Point, ...args: A) => T;
  move: (drag: T, point: Point) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

const pointOf = (e: SvgPointerEvent) => localFromClient(e.currentTarget, e.clientX, e.clientY);

export const usePointerDrag = <A extends unknown[], T>({ begin, move, onStart, onEnd }: DragSpec<A, T>) => {
  const active = useRef<{ pointerId: number; drag: T } | null>(null);

  const onPointerMove = (e: SvgPointerEvent) => {
    const current = active.current;
    if (current?.pointerId !== e.pointerId) return;
    const point = pointOf(e);
    if (point) move(current.drag, point);
  };

  const onPointerUp = (e: SvgPointerEvent) => {
    if (active.current?.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    active.current = null;
    onEnd?.();
  };

  const onPointerDown = (e: SvgPointerEvent, args: A) => {
    const point = pointOf(e);
    if (!point) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = { pointerId: e.pointerId, drag: begin(point, ...args) };
    onStart?.();
  };

  return (...args: A) => ({
    onPointerDown: (e: SvgPointerEvent) => onPointerDown(e, args),
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  });
};

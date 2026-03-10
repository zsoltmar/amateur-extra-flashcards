'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

export function Tooltip({ content, side = 'top', children }: { content: ReactNode; side?: Side; children: ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [usedSide, setUsedSide] = useState<Side>(side);
  const [align, setAlign] = useState<'center' | 'start' | 'end'>('center');

  useEffect(() => setMounted(true), []);

  const computePosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    let nextSide: Side = side;
    const offset = 8;
    // Auto flip vertically if near viewport edge
    if (side === 'top' && rect.top < 40) nextSide = 'bottom';
    if (side === 'bottom' && vh - rect.bottom < 40) nextSide = 'top';
    switch (nextSide) {
      case 'bottom':
        y = rect.bottom + offset;
        break;
      case 'left':
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
      case 'top':
      default:
        y = rect.top - offset;
        break;
    }
    setUsedSide(nextSide);
    // Horizontal align heuristics (avoid clipping without measuring width)
    if (rect.left < 48) setAlign('start');
    else if (vw - rect.right < 48) setAlign('end');
    else setAlign('center');
    setPos({ x, y });
  };

  const show = () => {
    computePosition();
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {mounted && open && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-black/90 text-white text-[10px] px-1.5 py-0.5 shadow border border-white/10"
          style={{
            left: pos.x,
            top: pos.y,
            transform:
              usedSide === 'top'
                ? (align === 'center' ? 'translate(-50%, -100%)' : align === 'start' ? 'translate(0, -100%)' : 'translate(-100%, -100%)')
                : usedSide === 'bottom'
                ? (align === 'center' ? 'translate(-50%, 0)' : align === 'start' ? 'translate(0, 0)' : 'translate(-100%, 0)')
                : usedSide === 'left'
                ? 'translate(-100%, -50%)'
                : 'translate(0, -50%)',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </span>
  );
}


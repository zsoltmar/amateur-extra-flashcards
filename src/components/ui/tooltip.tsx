'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

export function Tooltip({ content, side = 'top', children }: { content: ReactNode; side?: Side; children: ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  const [usedSide, setUsedSide] = useState<Side>(side);

  useEffect(() => setMounted(true), []);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const computePosition = () => {
    const el = anchorRef.current;
    const tip = tipRef.current;
    if (!el || !tip) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipRect = tip.getBoundingClientRect();
    const offset = 8;

    // Choose vertical side based on available space and tooltip height
    let nextSide: Side = side;
    const needHeight = tipRect.height + offset + 8; // include margins
    if (side === 'top' && rect.top < needHeight) nextSide = 'bottom';
    if (side === 'bottom' && vh - rect.bottom < needHeight) nextSide = 'top';

    let left = rect.left + rect.width / 2 - tipRect.width / 2; // center align by default
    let top = 0;
    if (nextSide === 'top') {
      top = rect.top - offset - tipRect.height;
    } else if (nextSide === 'bottom') {
      top = rect.bottom + offset;
    } else if (nextSide === 'left') {
      left = rect.left - offset - tipRect.width;
      top = rect.top + rect.height / 2 - tipRect.height / 2;
    } else if (nextSide === 'right') {
      left = rect.right + offset;
      top = rect.top + rect.height / 2 - tipRect.height / 2;
    }

    // Clamp within viewport with 8px padding
    left = clamp(left, 8, Math.max(8, vw - tipRect.width - 8));
    top = clamp(top, 8, Math.max(8, vh - tipRect.height - 8));

    setUsedSide(nextSide);
    setCoords({ left, top });
  };

  const show = () => {
    setOpen(true);
  };
  const hide = () => setOpen(false);

  // Recompute position when opening and on resize/scroll
  useEffect(() => {
    if (!open) return;
    const rAF = () => requestAnimationFrame(computePosition);
    rAF();
    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

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
          ref={tipRef}
          role="tooltip"
          className="pointer-events-none fixed z-[9999] rounded bg-black/90 text-white text-[10px] px-2 py-1 shadow border border-white/10"
          style={{
            left: coords.left,
            top: coords.top,
            maxWidth: 'min(320px, calc(100vw - 16px))',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: 1.2,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </span>
  );
}


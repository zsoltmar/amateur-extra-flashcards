'use client';

import { Badge } from '@/components/ui/badge';

export function NumberPill({ id, floating = false }: { id: string; floating?: boolean }) {
  const pill = (
    <Badge
      variant="naked"
      className="text-[11px] leading-none py-0.5 text-slate-300 dark:text-white/20"
    >
      {id}
    </Badge>
  );

  if (floating) {
    return (
      <div className="absolute top-4 left-4 pointer-events-none z-10">
        {pill}
      </div>
    );
  }

  return <div>{pill}</div>;
}

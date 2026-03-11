'use client';

import { Badge } from '@/components/ui/badge';

export function NumberPill({ id, floating = false }: { id: string; floating?: boolean }) {
  const pill = (
    <Badge
      variant="outline"
      className="text-[11px] leading-none px-2 py-0.5 border-black/20 text-slate-700 dark:text-white/70 dark:border-white/20 bg-white/70 dark:bg-black/50 backdrop-blur-sm"
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

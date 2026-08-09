'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { BLOCK_LIST, type SiteBlockType } from '@/lib/site/blocks';
import { Input } from '@/components/ui/input';

interface PaletteProps {
  onAdd: (type: SiteBlockType) => void;
}

export function Palette({ onAdd }: PaletteProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = BLOCK_LIST.filter((b) => `${b.label} ${b.description}`.toLowerCase().includes(q));

  return (
    <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm lg:max-h-[calc(100vh-13rem)]">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Add Sections</h2>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections…"
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.type}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', b.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAdd(b.type)}
              className="group w-full rounded-lg border bg-background p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{b.label}</span>
                <Plus className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{b.description}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="pt-2 text-center text-xs text-muted-foreground">No sections match “{query}”</p>
        )}
      </div>
    </div>
  );
}
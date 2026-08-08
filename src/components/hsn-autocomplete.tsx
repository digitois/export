'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HsnSuggestion {
  code: string;
  description: string;
  code_type: 'hsn' | 'sac';
}

interface HsnAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function HsnAutocomplete({ value, onChange, placeholder }: HsnAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<HsnSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = value?.trim();
    if (timer.current) clearTimeout(timer.current);
    if (!trimmed || /^\d+$/.test(trimmed)) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, limit: '8' });
        const res = await fetch(`/api/hsn/search?${params.toString()}`);
        const json = await res.json();
        setSuggestions(json.data ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(s: HsnSuggestion) {
    onChange(s.code);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'e.g. 09103010'}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <Button
              key={s.code}
              type="button"
              variant="ghost"
              className={cn(
                'flex h-auto w-full items-start justify-start gap-2 rounded-none px-3 py-2 text-left',
                i === active && 'bg-accent'
              )}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
            >
              <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>
                <span className="block font-mono text-sm font-semibold">{s.code}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Search, Copy, Check, Loader2, BookOpen, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HsnRow {
  code: string;
  description: string;
  code_type: 'hsn' | 'sac';
  chapter: string | null;
}

type TypeFilter = 'all' | 'hsn' | 'sac';

const SUGGESTIONS = ['turmeric', 'basmati rice', 'cotton yarn', 'stainless steel', 'coffee', 'leather', 'granite'];

export default function HsnSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HsnRow[]>([]);
  const [type, setType] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, limit: '30' });
        if (type !== 'all') params.set('type', type);
        const res = await fetch(`/api/hsn/search?${params.toString()}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, type]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Copied ${code}`);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Copy failed');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HSN / SAC Code Search"
        description="Search 22,470+ official CBIC HSN and SAC codes by product name or code. Free for exporters and customs filings."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'turmeric', 'basmati rice', 'cotton yarn' or an 8-digit code…"
              className="h-12 pl-9 text-base"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {!query.trim() && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Popular:</span>
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setQuery(s)}>
                  {s}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            {(['all', 'hsn', 'sac'] as const).map((t) => (
              <Badge
                key={t}
                variant={type === t ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setType(t)}
              >
                {t === 'hsn' ? 'Goods (HSN)' : t === 'sac' ? 'Services (SAC)' : 'All'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {query.trim() && !loading && (
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{query.trim()}&rdquo;
          </p>
        )}

        {!loading && results.length === 0 && query.trim() && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No matching codes. Try a shorter search term or a different spelling.
              </p>
            </CardContent>
          </Card>
        )}

        {results.map((row) => (
          <Card key={row.code} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-semibold">{formatCode(row.code)}</span>
                  <Badge variant={row.code_type === 'hsn' ? 'secondary' : 'outline'} className="text-[10px] uppercase">
                    {row.code_type === 'hsn' ? 'HSN' : 'SAC'}
                  </Badge>
                  {row.chapter && (
                    <Badge variant="outline" className="text-[10px]">
                      Chapter {row.chapter}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyCode(row.code)} title="Copy code">
                {copied === row.code ? <Check className="h-4 w-4 text-pos" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        ))}

        {!query.trim() && !loading && (
          <Card>
            <CardContent className="grid gap-6 py-8 sm:grid-cols-3">
              <InfoTile icon={<Hash className="h-5 w-5" />} title="22,470+ codes" desc="Full official CBIC HSN goods and SAC services directory." />
              <InfoTile icon={<Search className="h-5 w-5" />} title="Search by product" desc="Describe your product in plain words — we find the code." />
              <InfoTile icon={<BookOpen className="h-5 w-5" />} title="Export ready" desc="Copy 8-digit codes straight into invoices and shipping docs." />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoTile({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function formatCode(code: string) {
  return code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}
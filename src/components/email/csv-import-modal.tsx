'use client';

import { useRef, useState } from 'react';
import { FileUp, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId?: string;
  onImported?: () => void;
}

export function CsvImportModal({ open, onOpenChange, listId, onImported }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{
    headers: string[];
    rows: string[][];
    emailCol: string;
    listId: string;
    importing: boolean;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ successful: number; failed: number } | null>(null);
  const [selectedList, setSelectedList] = useState(listId ?? '');
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const lines = text.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('CSV needs a header row and at least one contact');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')));
      const emailCol = headers.find(h => /email/i.test(h)) ?? headers[0];
      setParsed({ headers, rows, emailCol, listId: listId ?? '', importing: false });
      setResult(null);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!parsed) return;
    setImporting(true);
    try {
      const emailIdx = parsed.headers.findIndex(h => h === parsed.emailCol);
      const contacts = parsed.rows.map(row => ({ email: row[emailIdx] ?? '' })).filter(c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));

      if (contacts.length === 0) {
        toast.error('No valid emails found. Check the email column selection.');
        setImporting(false);
        return;
      }

      const res = await api<{ data: { successful: number; failed: number } }>('/api/email/import', {
        method: 'POST',
        body: {
          action: 'run',
          listId: selectedList || null,
          filename: 'import.csv',
          columnMapping: { email: emailIdx },
          contacts
        }
      });
      setResult(res.data);
      toast.success(`Imported ${res.data.successful} contacts`);
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function loadListsOnce() {
    if (lists.length) return;
    api<{ data: { id: string; name: string }[] }>('/api/email/lists')
      .then(res => setLists(res.data))
      .catch(() => setLists([]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" onOpenAutoFocus={() => loadListsOnce()}>
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>Upload a CSV, preview rows, then import into your contacts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              <FileUp className="mr-1.5 h-4 w-4" /> Choose CSV
            </Button>
            {parsed && (
              <Badge variant="outline">{parsed.rows.length} rows · {parsed.headers.length} columns</Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Target list</span>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All contacts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All contacts</SelectItem>
                  {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {parsed && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Email column:</span>
                <Select
                  value={parsed.emailCol}
                  onValueChange={(v) => setParsed({ ...parsed, emailCol: v })}
                >
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {parsed.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsed.headers.slice(0, 6).map(h => (
                        <TableHead key={h} className="text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 8).map((row, ri) => (
                      <TableRow key={ri}>
                        {row.slice(0, 6).map((cell, ci) => (
                          <TableCell key={ci} className="text-xs">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsed.rows.length > 8 && (
                <p className="text-xs text-muted-foreground">Showing first 8 of {parsed.rows.length} rows</p>
              )}

              {result && (
                <div className="flex items-center gap-3 rounded-lg border border-pos/30 bg-pos/5 p-3">
                  <CheckCircle2 className="h-4 w-4 text-pos" />
                  <p className="text-sm">
                    Imported <strong>{result.successful}</strong> contacts
                    {result.failed > 0 && <> · <AlertTriangle className="inline h-3.5 w-3.5 text-amber-500" /> {result.failed} failed</>}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => setParsed(null)}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
                <Button type="button" size="sm" onClick={runImport} disabled={importing}>
                  {importing && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  {importing ? 'Importing...' : 'Import Contacts'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
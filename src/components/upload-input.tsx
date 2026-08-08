'use client';

import { useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/loading';
import { cn } from '@/lib/utils';

async function upload(bucket: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Upload failed');
  return json.data.url;
}

interface UploadInputProps {
  bucket?: string;
  accept?: string;
  label?: string;
  value?: string | null;
  onChange: (url: string) => void;
  className?: string;
}

export function UploadInput({ bucket = 'company', accept, label = 'File', value, onChange, className }: UploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await upload(bucket, file);
      onChange(url);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        className="max-w-xs"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {uploading && <Spinner />}
      {value && (
        <div className="flex items-center gap-2">
          <span className="max-w-[160px] truncate text-xs text-muted-foreground">{label} uploaded</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Remove upload"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface UploadButtonProps {
  bucket?: string;
  accept?: string;
  label?: string;
  onUploaded: (url: string) => void;
  className?: string;
}

export function UploadButton({ bucket = 'company', accept, label = 'Upload', onUploaded, className }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await upload(bucket, file);
      onUploaded(url);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Spinner /> : <UploadCloud className="h-4 w-4" />}
        {label}
      </Button>
    </>
  );
}
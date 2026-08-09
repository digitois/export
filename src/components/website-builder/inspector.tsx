'use client';

import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BLOCK_META, type SiteBlock } from '@/lib/site/blocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => cloneValue(v)) as unknown as T;
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) out[key] = cloneValue(value[key]);
    return out as T;
  }
  return value;
}

function prettify(key: string): string {
  return key.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`).replace(/^./, (c) => c.toUpperCase());
}

function stringFields(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter((k) => {
    const v = obj[k];
    return typeof v === 'string' || typeof v === 'number';
  });
}

interface InspectorProps {
  block: SiteBlock;
  onChange: (props: Record<string, unknown>) => void;
  onDelete: () => void;
}

export function Inspector({ block, onChange, onDelete }: InspectorProps) {
  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;
  const defaults = meta.defaults;

  function setProp(key: string, value: unknown) {
    onChange({ ...block.props, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{meta.label}</p>
            <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {Object.keys(defaults).map((key) => {
        const value = key in block.props ? block.props[key] : defaults[key];
        const label = prettify(key);

        if (typeof value === 'boolean') {
          return (
            <Field key={key} label={label}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Enabled</span>
                <Switch checked={value} onCheckedChange={(checked) => setProp(key, checked)} />
              </div>
            </Field>
          );
        }

        if (Array.isArray(value)) {
          return (
            <Field key={key} label={label}>
              <ArrayEditor
                defaultsKey={key}
                blockType={block.type}
                value={value}
                template={defaults[key]}
                onChange={(next) => setProp(key, next)}
              />
            </Field>
          );
        }

        if (typeof value === 'number') {
          return (
            <Field key={key} label={label}>
              <Input
                type="number"
                value={String(value)}
                onChange={(e) => setProp(key, Number(e.target.value))}
              />
            </Field>
          );
        }

        if (block.type === 'html' && key === 'code') {
          return (
            <Field key={key} label={label}>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => setProp(key, e.target.value)}
              />
            </Field>
          );
        }

        return (
          <Field key={key} label={label}>
            <Input
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => setProp(key, e.target.value)}
            />
          </Field>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface ArrayEditorProps {
  defaultsKey: string;
  blockType: SiteBlock['type'];
  value: unknown[];
  template: unknown;
  onChange: (next: unknown[]) => void;
}

function ArrayEditor({ defaultsKey, blockType, value, template, onChange }: ArrayEditorProps) {
  const isStringArray =
    value.every((v) => typeof v === 'string') || (value.length === 0 && typeof template === 'string');

  function addItem() {
    if (isStringArray) {
      onChange([...value.map(String), '']);
      return;
    }
    let base: Record<string, unknown> = {};
    const existing = value.find(isRecord);
    if (isRecord(template)) base = template;
    else if (existing) base = existing;
    else if (blockType === 'gallery' && defaultsKey === 'images') base = { url: '', caption: '' };
    else if (blockType === 'features') base = { icon: '', title: '', description: '' };
    else if (blockType === 'stats') base = { label: '', value: '' };
    else if (blockType === 'testimonials') base = { quote: '', author: '', role: '', company: '' };
    else if (blockType === 'faq') base = { q: '', a: '' };
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(base)) next[key] = typeof base[key] === 'string' ? '' : cloneValue(base[key]);
    onChange([...value, next]);
  }

  function updateAt(index: number, next: unknown) {
    const copy: unknown[] = cloneValue(value);
    copy[index] = next;
    onChange(copy);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => {
        if (typeof item === 'string') {
          return (
            <div key={index} className="flex items-center gap-2">
              <Input value={item} onChange={(e) => updateAt(index, e.target.value)} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={() => removeAt(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        if (isRecord(item)) {
          const fields = stringFields(item);
          return (
            <div key={index} className="space-y-2 rounded-lg border p-2">
              {fields.map((f) => {
                const fieldValue = item[f];
                return (
                  <div key={f} className="space-y-1">
                    <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {prettify(f)}
                    </Label>
                    <Input
                      type={typeof fieldValue === 'number' ? 'number' : 'text'}
                      value={typeof fieldValue === 'number' ? String(fieldValue) : String(fieldValue ?? '')}
                      onChange={(e) =>
                        updateAt(index, {
                          ...item,
                          [f]: typeof fieldValue === 'number' ? Number(e.target.value) : e.target.value
                        })
                      }
                    />
                  </div>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-destructive"
                onClick={() => removeAt(index)}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          );
        }
        return null;
      })}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}
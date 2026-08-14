import type { SupabaseClient } from '@supabase/supabase-js';

export interface ContactImportJob {
  id: string;
  organization_id: string;
  list_id?: string | null;
  filename: string;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  state: 'pending' | 'preview' | 'running' | 'completed' | 'failed' | 'cancelled';
  column_mapping?: Record<string, number>;
  preview_data?: Record<string, unknown>[];
  error?: string | null;
  created_by?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ImportError {
  id: string;
  import_job_id: string;
  row_number: number;
  email?: string | null;
  error: string;
  raw_data?: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateImportJobInput {
  list_id?: string;
  filename: string;
  total_rows: number;
  column_mapping?: Record<string, number>;
  preview_data?: Record<string, unknown>[];
}

export interface ContactRow {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  country?: string;
  custom_fields?: Record<string, unknown>;
}

// ============================================
// IMPORT JOB CRUD
// ============================================

export async function createImportJob(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateImportJobInput
) {
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .insert({
      ...input,
      organization_id: organizationId,
      created_by: userId,
      state: 'preview',
      processed_rows: 0,
      successful_rows: 0,
      failed_rows: 0
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getImportJob(supabase: SupabaseClient, organizationId: string, jobId: string) {
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', jobId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function listImportJobs(supabase: SupabaseClient, organizationId: string, opts: { state?: string } = {}) {
  let query = supabase
    .from('contact_import_jobs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.state) query = query.eq('state', opts.state);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function updateImportJob(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string,
  updates: Partial<ContactImportJob>
) {
  const { data, error } = await supabase
    .from('contact_import_jobs')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('id', jobId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getImportErrors(supabase: SupabaseClient, organizationId: string, jobId: string) {
  const { data, error } = await supabase
    .from('contact_import_errors')
    .select('*')
    .eq('import_job_id', jobId)
    .order('row_number');

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

// ============================================
// CSV PARSING & VALIDATION
// ============================================

export interface ParsedContact {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  country?: string;
  custom_fields: Record<string, unknown>;
}

export interface ValidationResult {
  valid: ParsedContact[];
  invalid: Array<{ row: number; email?: string; error: string; raw: Record<string, unknown> }>;
}

export function parseCSV(csvText: string, columnMapping: Record<string, number>): ValidationResult {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { valid: [], invalid: [{ row: 1, error: 'CSV must have header and at least one data row', raw: {} }] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const valid: ParsedContact[] = [];
  const invalid: ValidationResult['invalid'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      invalid.push({ row: rowNum, error: `Column count mismatch (expected ${headers.length}, got ${values.length})`, raw: {} });
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() ?? ''; });

    // Map columns
    const email = row[headers[columnMapping.email]]?.trim().toLowerCase();
    const firstName = columnMapping.first_name !== undefined ? row[headers[columnMapping.first_name]] : undefined;
    const lastName = columnMapping.last_name !== undefined ? row[headers[columnMapping.last_name]] : undefined;
    const company = columnMapping.company !== undefined ? row[headers[columnMapping.company]] : undefined;
    const country = columnMapping.country !== undefined ? row[headers[columnMapping.country]] : undefined;

    // Validate email
    if (!email || !isValidEmail(email)) {
      invalid.push({ 
        row: rowNum, 
        email: email || undefined, 
        error: 'Invalid or missing email', 
        raw: row 
      });
      continue;
    }

    // Build custom fields from unmapped columns
    const mappedHeaders = new Set(Object.values(columnMapping).filter(v => v !== undefined));
    const customFields: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (!mappedHeaders.has(idx)) {
        customFields[h] = values[idx];
      }
    });

    valid.push({
      email,
      first_name: firstName,
      last_name: lastName,
      company,
      country,
      custom_fields: customFields
    });
  }

  return { valid, invalid };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// IMPORT EXECUTION
// ============================================

export async function processImport(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string,
  contacts: Array<{ email: string; first_name?: string; last_name?: string; company?: string; country?: string; custom_fields?: Record<string, unknown> }>,
  listId?: string
) {
  // Update job state to running
  await supabase
    .from('contact_import_jobs')
    .update({ state: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);

  let successful = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      await supabase
        .from('email_contacts')
        .upsert({
          organization_id: organizationId,
          email: contact.email,
          first_name: contact.first_name ?? null,
          last_name: contact.last_name ?? null,
          company: contact.company ?? null,
          country: contact.country ?? null,
          list_id: listId ?? null,
          custom_fields: contact.custom_fields ?? {},
          unsubscribed: false
        }, {
          onConflict: 'organization_id,email'
        });

      successful++;
    } catch (err) {
      await supabase
        .from('contact_import_errors')
        .insert({
          import_job_id: jobId,
          row_number: successful + 1, // approximate
          email: contact.email,
          error: err instanceof Error ? err.message : 'Unknown error',
          raw_data: contact
        });
      failed++;
    }
  }

  // Update job completion
  await supabase
    .from('contact_import_jobs')
    .update({
      state: 'completed',
      processed_rows: successful + failed,
      successful_rows: successful,
      failed_rows: failed,
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return { successful, failed };
}

// ============================================
// SPINTAX SUPPORT
// ============================================

export interface SpintaxResult {
  variations: string[];
  variationCount: number;
}

export function parseSpintax(pattern: string): string[] {
  // Simple spintax parser: {option1|option2|option3}
  // Handles nested spintax
  
  const results: string[] = [''];
  
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '{') {
      // Find matching }
      let depth = 1;
      let j = i + 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '{') depth++;
        else if (pattern[j] === '}') depth--;
        j++;
      }
      
      if (depth === 0) {
        const options = pattern.slice(i + 1, j - 1).split('|');
        const newResults: string[] = [];
        for (const base of results) {
          for (const option of options) {
            newResults.push(base + option + pattern.slice(j));
          }
        }
        results.splice(0, results.length, ...newResults);
        // Restart parsing from beginning with expanded patterns
        return results.flatMap(r => parseSpintax(r));
      }
    }
    i++;
  }
  
  return [pattern];
}

export function renderSpintax(pattern: string, seed?: number): string {
  const variations = parseSpintax(pattern);
  if (variations.length === 1) return variations[0];
  
  if (seed !== undefined) {
    return variations[seed % variations.length];
  }
  return variations[Math.floor(Math.random() * variations.length)];
}

export function getSpintaxVariations(pattern: string): { variations: string[]; count: number } {
  const variations = parseSpintax(pattern);
  return { variations, count: variations.length };
}
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export interface Template {
  id: string;
  organization_id: string;
  name: string;
  subject?: string | null;
  body?: string | null;
  body_json?: Record<string, unknown> | null;
  subject_text?: string | null;
  html_content?: string | null;
  preview_text?: string | null;
  category?: string | null;
  thumbnail_url?: string | null;
  parent_template_id?: string | null;
  is_variant: boolean;
  is_active: boolean;
  usage_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateBlock {
  id: string;
  template_id: string;
  block_type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social' | 'cta' | 'html' | 'personalization';
  position: number;
  config: Record<string, unknown>;
  content?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryTemplate {
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  subject: string;
  preview_text?: string | null;
  body_json: Record<string, unknown>;
  thumbnail_url?: string | null;
  tags?: string[];
}

export interface CreateTemplateInput {
  name: string;
  subject?: string;
  body?: string;
  body_json?: Record<string, unknown>;
  subject_text?: string;
  preview_text?: string;
  category?: string;
  thumbnail_url?: string;
  parent_template_id?: string;
  is_variant?: boolean;
  blocks?: Array<Omit<TemplateBlock, 'id' | 'template_id' | 'created_at' | 'updated_at'>>;
}

export interface CreateVariantInput {
  name: string;
  subject?: string;
  body_json?: Record<string, unknown>;
  subject_text?: string;
}

export interface TemplateStats {
  total: number;
  variants: number;
  active: number;
  total_usage: number;
}

// ============================================
// TEMPLATE CRUD (Enhanced)
// ============================================

export async function listTemplates(
  supabase: SupabaseClient, 
  organizationId: string, 
  opts: { includeVariants?: boolean; activeOnly?: boolean } = {}
) {
  let query = supabase
    .from('email_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (!opts.includeVariants) query = query.eq('is_variant', false);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function getTemplate(supabase: SupabaseClient, organizationId: string, templateId: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', templateId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getTemplateWithBlocks(supabase: SupabaseClient, organizationId: string, templateId: string) {
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', templateId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };

  const { data: blocks } = await supabase
    .from('email_template_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('position');

  return { 
    data: { ...template, blocks: blocks ?? [] }, 
    error: undefined 
  };
}

export async function createTemplate(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateTemplateInput
) {
  const { blocks, ...templateData } = input;

  const { data: template, error } = await supabase
    .from('email_templates')
    .insert({
      ...templateData,
      organization_id: organizationId,
      created_by: userId,
      is_variant: false
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };

  // Create blocks if provided
  if (blocks?.length) {
    const blockRows = blocks.map((block, index) => ({
      ...block,
      template_id: template.id,
      position: block.position ?? index
    }));

    const { error: blockError } = await supabase
      .from('email_template_blocks')
      .insert(blockRows);

    if (blockError) console.error('Failed to create blocks:', blockError);
  }

  return { data: template, error: undefined };
}

export async function updateTemplate(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string,
  updates: Partial<Omit<CreateTemplateInput, 'blocks'>>,
  blocks?: CreateTemplateInput['blocks']
) {
  const { data: template, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };

  // Update blocks if provided
  if (blocks) {
    await supabase.from('email_template_blocks').delete().eq('template_id', templateId);
    
    if (blocks.length > 0) {
      const blocksData = blocks.map((block, index) => ({
        ...block,
        template_id: templateId,
        position: block.position ?? index
      }));

      const { error: blockError } = await supabase
        .from('email_template_blocks')
        .insert(blocksData);

      if (blockError) console.error('Failed to update blocks:', blockError);
    }
  }

  return { data: template, error: undefined };
}

export async function deleteTemplate(supabase: SupabaseClient, organizationId: string, templateId: string) {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', templateId);

  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function duplicateTemplate(supabase: SupabaseClient, organizationId: string, userId: string, templateId: string, newName: string) {
  const { data: original } = await getTemplate(supabase, organizationId, templateId);
  if (!original) return { data: null, error: new Error('Template not found') };

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      ...original,
      id: undefined,
      name: newName,
      is_variant: false,
      parent_template_id: null,
      usage_count: 0,
      created_by: userId,
      created_at: undefined,
      updated_at: undefined
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

// ============================================
// VARIANTS (A/B Testing)
// ============================================

export async function createVariant(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  parentTemplateId: string,
  input: CreateVariantInput
) {
  const { data: parent, error: parentError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', parentTemplateId)
    .single();

  if (parentError || !parent) return { data: null, error: new Error('Parent template not found') };

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      organization_id: organizationId,
      name: input.name,
      subject: input.subject ?? parent.subject,
      subject_text: input.subject_text ?? parent.subject_text,
      body_json: input.body_json ?? parent.body_json,
      category: parent.category,
      thumbnail_url: parent.thumbnail_url,
      parent_template_id: parent.id,
      is_variant: true,
      created_by: userId
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function listVariants(supabase: SupabaseClient, organizationId: string, parentTemplateId: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('parent_template_id', parentTemplateId)
    .eq('is_variant', true)
    .order('name');

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function getTemplateStats(supabase: SupabaseClient, organizationId: string): Promise<{ data: { total: number; variants: number; active: number; total_usage: number } | null; error: Error | undefined }> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('is_variant, is_active, usage_count')
    .eq('organization_id', organizationId);

  if (error) return { data: null, error: new Error(error.message) };

  const stats = {
    total: data?.length ?? 0,
    variants: data?.filter(t => t.is_variant).length ?? 0,
    active: data?.filter(t => t.is_active).length ?? 0,
    total_usage: data?.reduce((sum, t) => sum + (t.usage_count ?? 0), 0) ?? 0
  };

  return { data: stats, error: undefined };
}

// ============================================
// BLOCKS (Drag-and-drop)
// ============================================

export async function listBlocks(supabase: SupabaseClient, templateId: string) {
  const { data, error } = await supabase
    .from('email_template_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('position');

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function createBlock(
  supabase: SupabaseClient,
  templateId: string,
  block: Omit<TemplateBlock, 'id' | 'template_id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('email_template_blocks')
    .insert({ ...block, template_id: templateId })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function updateBlock(supabase: SupabaseClient, blockId: string, updates: Partial<TemplateBlock>) {
  const { data, error } = await supabase
    .from('email_template_blocks')
    .update(updates)
    .eq('id', blockId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function deleteBlock(supabase: SupabaseClient, blockId: string) {
  const { error } = await supabase.from('email_template_blocks').delete().eq('id', blockId);
  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function reorderBlocks(supabase: SupabaseClient, templateId: string, blockIds: string[]) {
  const updates = blockIds.map((id, index) => ({ id, position: index }));
  const { error } = await supabase.from('email_template_blocks').upsert(updates);
  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

// ============================================
// TEMPLATE LIBRARY (Prebuilt templates)
// ============================================

export async function getLibraryTemplates(supabase: SupabaseClient, category?: string) {
  let query = supabase
    .from('template_library')
    .select('*')
    .eq('is_public', true)
    .order('category')
    .order('name');

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function getLibraryTemplate(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from('template_library')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function createTemplateFromLibrary(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  slug: string,
  customName?: string
) {
  const { data: libraryTemplate, error: libraryError } = await getLibraryTemplate(supabase, slug);
  if (libraryError || !libraryTemplate) return { data: null, error: new Error('Library template not found') };

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      organization_id: organizationId,
      name: customName ?? libraryTemplate.name,
      subject: libraryTemplate.subject,
      body_json: libraryTemplate.body_json,
      preview_text: libraryTemplate.preview_text,
      category: libraryTemplate.category,
      thumbnail_url: libraryTemplate.thumbnail_url,
      created_by: userId
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

// ============================================
// COMPILE TEMPLATE (Tiptap JSON → HTML)
// ============================================

export function compileTemplate(bodyJson: Record<string, unknown>, variables: Record<string, string> = {}): string {
  // This would use @genius-campaign/shared renderBodyHtml
  // For now, return placeholder
  return '<!-- Compiled HTML from Tiptap JSON -->';
}

export function extractPlainText(bodyJson: Record<string, unknown>): string {
  // Extract plain text from Tiptap JSON for text version
  return '';
}

// ============================================
// PERSONALIZATION / MERGE TAGS
// ============================================

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}

export function extractPersonalizationTokens(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  return matches ? [...new Set(matches.map(m => m.slice(2, -2)))] : [];
}
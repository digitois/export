import type { SupabaseClient } from '@supabase/supabase-js';

export async function listDocuments(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; type?: string; folderId?: string;
}) {
  let query = supabase
    .from('documents')
    .select('*, uploaded_by:profiles(full_name, email)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.type) query = query.eq('document_type', opts.type);
  if (opts.folderId) query = query.eq('folder_id', opts.folderId);
  if (opts.q) query = query.ilike('name', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function listDocumentFolders(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('document_folders')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');
  return data ?? [];
}

export async function createDocumentFolder(supabase: SupabaseClient, organizationId: string, name: string, parentId?: string | null) {
  const { data, error } = await supabase
    .from('document_folders')
    .insert({ organization_id: organizationId, name, parent_id: parentId ?? null })
    .select()
    .single();
  return { data, error };
}

export async function createDocument(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  payload: {
    name: string;
    documentType: string;
    description?: string | null;
    folderId?: string | null;
    storagePath: string;
    fileSize: number;
    mimeType?: string | null;
    version?: number;
  }
) {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      organization_id: organizationId,
      name: payload.name,
      document_type: payload.documentType,
      description: payload.description,
      folder_id: payload.folderId ?? null,
      storage_path: payload.storagePath,
      file_size: payload.fileSize,
      mime_type: payload.mimeType,
      version: payload.version ?? 1,
      uploaded_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function deleteDocument(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

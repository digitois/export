import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { expenseSchema } from '@/lib/validations';

export type ExpenseInput = z.infer<typeof expenseSchema>;

const EXPENSE_SELECT = '*';

export async function listExpenses(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; category?: string;
}) {
  let query = supabase
    .from('expenses')
    .select(EXPENSE_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('expense_date', { ascending: false });

  if (opts.category) query = query.eq('category', opts.category);
  if (opts.q) query = query.or(`vendor.ilike.%${opts.q}%,notes.ilike.%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getExpense(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createExpense(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: ExpenseInput
) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      organization_id: organizationId,
      category: input.category,
      vendor: input.vendor ?? null,
      amount: input.amount,
      currency: input.currency,
      expense_date: input.expenseDate,
      notes: input.notes ?? null,
      attachment_url: input.attachmentUrl ?? null,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateExpense(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: ExpenseInput
) {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      category: input.category,
      vendor: input.vendor ?? null,
      amount: input.amount,
      currency: input.currency,
      expense_date: input.expenseDate,
      notes: input.notes ?? null,
      attachment_url: input.attachmentUrl ?? null
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteExpense(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

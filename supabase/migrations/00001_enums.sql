-- ------------------------------------------------------------------
-- Export OS - 00001: Enums
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'member_role' and n.nspname = 'public') then
    create type public.member_role as enum ('owner', 'admin', 'manager', 'employee');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'invitation_status' and n.nspname = 'public') then
    create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'org_status' and n.nspname = 'public') then
    create type public.org_status as enum ('active', 'trial', 'suspended', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'product_status' and n.nspname = 'public') then
    create type public.product_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'lead_source' and n.nspname = 'public') then
    create type public.lead_source as enum ('website', 'manual', 'trade_fair', 'indiamart', 'alibaba', 'linkedin', 'referral', 'email', 'other');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'lead_priority' and n.nspname = 'public') then
    create type public.lead_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'lead_status' and n.nspname = 'public') then
    create type public.lead_status as enum ('new', 'contacted', 'qualified', 'quotation_sent', 'negotiation', 'won', 'lost');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'lead_activity_type' and n.nspname = 'public') then
    create type public.lead_activity_type as enum ('note', 'call', 'email', 'meeting', 'follow_up', 'status_change', 'assignment');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'incoterms' and n.nspname = 'public') then
    create type public.incoterms as enum ('EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'quotation_status' and n.nspname = 'public') then
    create type public.quotation_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'invoice_type' and n.nspname = 'public') then
    create type public.invoice_type as enum ('commercial', 'proforma', 'credit_note', 'debit_note');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'invoice_status' and n.nspname = 'public') then
    create type public.invoice_status as enum ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'document_status' and n.nspname = 'public') then
    create type public.document_status as enum ('active', 'archived');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'blog_status' and n.nspname = 'public') then
    create type public.blog_status as enum ('draft', 'scheduled', 'published');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'ai_provider' and n.nspname = 'public') then
    create type public.ai_provider as enum ('openai', 'anthropic');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'ai_message_role' and n.nspname = 'public') then
    create type public.ai_message_role as enum ('system', 'user', 'assistant');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'campaign_status' and n.nspname = 'public') then
    create type public.campaign_status as enum ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'subscription_status' and n.nspname = 'public') then
    create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'expired');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'billing_cycle' and n.nspname = 'public') then
    create type public.billing_cycle as enum ('monthly', 'annual');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'payment_status' and n.nspname = 'public') then
    create type public.payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'ticket_status' and n.nspname = 'public') then
    create type public.ticket_status as enum ('open', 'pending', 'resolved', 'closed');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'ticket_priority' and n.nspname = 'public') then
    create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'notification_type' and n.nspname = 'public') then
    create type public.notification_type as enum ('lead_new', 'lead_update', 'quotation', 'invoice', 'payment', 'email', 'blog', 'system', 'support');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'website_theme' and n.nspname = 'public') then
    create type public.website_theme as enum ('modern', 'classic', 'minimal', 'bold');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'activity_type' and n.nspname = 'public') then
    create type public.activity_type as enum ('created', 'updated', 'deleted', 'status_changed', 'sent', 'generated', 'imported', 'exported', 'published');
  end if;
end $$;



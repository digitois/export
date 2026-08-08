-- ------------------------------------------------------------------
-- Export OS - 00002: Enums
-- ------------------------------------------------------------------

create type public.member_role as enum ('owner', 'admin', 'manager', 'employee');

create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create type public.org_status as enum ('active', 'trial', 'suspended', 'cancelled');

create type public.product_status as enum ('draft', 'published', 'archived');

create type public.lead_source as enum (
  'website', 'manual', 'trade_fair', 'indiamart', 'alibaba', 'linkedin', 'referral', 'email', 'other'
);

create type public.lead_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'quotation_sent', 'negotiation', 'won', 'lost'
);

create type public.lead_activity_type as enum (
  'note', 'call', 'email', 'meeting', 'follow_up', 'status_change', 'assignment'
);

create type public.incoterms as enum ('EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP');

create type public.quotation_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');

create type public.invoice_type as enum ('commercial', 'proforma', 'credit_note', 'debit_note');

create type public.invoice_status as enum ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void');

create type public.document_status as enum ('active', 'archived');

create type public.blog_status as enum ('draft', 'scheduled', 'published');

create type public.ai_provider as enum ('openai', 'anthropic');

create type public.ai_message_role as enum ('system', 'user', 'assistant');

create type public.campaign_status as enum ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled');

create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'expired');

create type public.billing_cycle as enum ('monthly', 'annual');

create type public.payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');

create type public.ticket_status as enum ('open', 'pending', 'resolved', 'closed');

create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.notification_type as enum (
  'lead_new', 'lead_update', 'quotation', 'invoice', 'payment', 'email', 'blog', 'system', 'support'
);

create type public.website_theme as enum ('modern', 'classic', 'minimal', 'bold');

create type public.activity_type as enum (
  'created', 'updated', 'deleted', 'status_changed', 'sent', 'generated', 'imported', 'exported', 'published'
);

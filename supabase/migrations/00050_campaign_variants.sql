-- ------------------------------------------------------------------
-- Export OS - 00050: Campaign A/B Variant Selection
--
-- Let campaigns send two template variants (A/B) split across contacts,
-- and track per-variant performance through email_activities.template_id
-- ------------------------------------------------------------------

alter table public.email_campaigns
  add column if not exists variant_template_id uuid references public.email_templates (id) on delete set null,
  add column if not exists variant_split_percent int not null default 50;

create index if not exists idx_email_campaigns_variant on public.email_campaigns (variant_template_id);
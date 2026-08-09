-- ------------------------------------------------------------------
-- Export OS - 00028: Website Builder — industry + template tracking
--
-- Records which industry template a tenant started from so the builder
-- can show the template-first onboarding only until a starting point is
-- chosen, and so we can reason about template usage. Both columns are
-- nullable text — no enum, so adding industries later needs no migration.
-- ------------------------------------------------------------------

alter table public.website_settings add column if not exists industry text;
alter table public.website_settings add column if not exists template_id text;

-- ------------------------------------------------------------------
-- Export OS - 00047: Contact Import & Spintax
--
-- CSV import with preview/validation, spintax parser
-- ------------------------------------------------------------------

-- Contact import jobs
create table if not exists public.contact_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_id uuid references public.email_lists (id) on delete set null,
  filename text not null,
  total_rows int not null default 0,
  processed_rows int not null default 0,
  successful_rows int not null default 0,
  failed_rows int not null default 0,
  state text not null default 'pending', -- 'pending', 'preview', 'running', 'completed', 'failed', 'cancelled'
  column_mapping jsonb, -- {email: 0, firstName: 1, lastName: 2, ...}
  preview_data jsonb, -- First 10 rows for preview
  error text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Import job errors (detailed)
create table if not exists public.contact_import_errors (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.contact_import_jobs (id) on delete cascade,
  row_number int not null,
  email text,
  error text not null,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

-- Spintax patterns cache (for performance)
create table if not exists public.spintax_cache (
  id uuid primary key default gen_random_uuid(),
  pattern_hash text not null unique, -- SHA256 of spintax pattern
  pattern text not null,
  variations text[] not null, -- All possible variations
  variation_count int not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_contact_import_jobs_org on public.contact_import_jobs (organization_id, state);
create index if not exists idx_contact_import_errors_job on public.contact_import_errors (import_job_id);
create index if not exists idx_spintax_cache_hash on public.spintax_cache (pattern_hash);

-- RLS
alter table public.contact_import_jobs enable row level security;
alter table public.contact_import_errors enable row level security;
alter table public.spintax_cache enable row level security;

-- Contact import jobs policies
drop policy if exists contact_import_jobs_select_org on public.contact_import_jobs;
create policy contact_import_jobs_select_org on public.contact_import_jobs
  for select using (public.is_org_member(organization_id));

drop policy if exists contact_import_jobs_insert_org on public.contact_import_jobs;
create policy contact_import_jobs_insert_org on public.contact_import_jobs
  for insert with check (public.is_org_member(organization_id));

drop policy if exists contact_import_jobs_update_org on public.contact_import_jobs;
create policy contact_import_jobs_update_org on public.contact_import_jobs
  for update using (public.is_org_member(organization_id));

drop policy if exists contact_import_jobs_delete_org on public.contact_import_jobs;
create policy contact_import_jobs_delete_org on public.contact_import_jobs
  for delete using (public.has_role(organization_id, 'manager'));

-- Contact import errors policies
drop policy if exists contact_import_errors_select_org on public.contact_import_errors;
create policy contact_import_errors_select_org on public.contact_import_errors
  for select using (
    exists (
      select 1 from public.contact_import_jobs cij
      where cij.id = contact_import_errors.import_job_id
      and is_org_member(cij.organization_id)
    )
  );

drop policy if exists contact_import_errors_insert_org on public.contact_import_errors;
create policy contact_import_errors_insert_org on public.contact_import_errors
  for insert with check (
    exists (
      select 1 from public.contact_import_jobs cij
      where cij.id = contact_import_errors.import_job_id
      and is_org_member(cij.organization_id)
    )
  );

-- Spintax cache: read-only for org members
drop policy if exists spintax_cache_select_org on public.spintax_cache;
create policy spintax_cache_select_org on public.spintax_cache
  for select using (true);

-- Grants
grant select, insert, update, delete on public.contact_import_jobs to authenticated, service_role;
grant select, insert, update, delete on public.contact_import_errors to authenticated, service_role;
grant select, insert, update, delete on public.spintax_cache to authenticated, service_role;

-- Function to parse spintax pattern
create or replace function public.parse_spintax(p_pattern text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variations text[];
  v_options text[];
  v_start int;
  v_end int;
  v_prefix text;
  v_suffix text;
  v_option text;
  v_combinations text[];
  v_current text[];
  v_i int;
  v_j int;
begin
  v_variations := array[]::text[];
  v_combinations := array[''];
  
  -- Simple spintax parser: {option1|option2|option3}
  -- This is a simplified version; production would use a proper parser
  
  v_prefix := p_pattern;
  v_variations := array[p_pattern];
  
  -- Find all {opt1|opt2|...} patterns
  while position('{' in v_prefix) > 0 loop
    v_start := position('{' in v_prefix);
    v_end := position('}' in substring(v_prefix from v_start));
    
    if v_end = 0 then
      exit;
    end if;
    
    v_end := v_start + v_end - 1;
    v_options := string_to_array(substring(v_prefix from v_start + 1 for v_end - v_start - 1), '|');
    v_suffix := substring(v_prefix from v_end + 1);
    v_prefix := substring(v_prefix from 1 for v_start - 1);
    
    v_current := array[]::text[];
    for v_i in 1..array_length(v_combinations, 1) loop
      for v_j in 1..array_length(v_options, 1) loop
        v_current := v_current || (v_combinations[v_i] || v_prefix || v_options[v_j] || v_suffix);
      end loop;
    end loop;
    
    v_combinations := v_current;
    v_prefix := v_combinations[1]; -- Just to continue parsing if nested
  end loop;
  
  if array_length(v_combinations, 1) = 1 and v_combinations[1] = p_pattern then
    return array[p_pattern]; -- No spintax found
  end if;
  
  return v_combinations;
exception
  when others then
    return array[p_pattern];
end;
$$;

grant execute on function public.parse_spintax(text) to authenticated, service_role;

-- Function to pick random spintax variation
create or replace function public.render_spintax(p_pattern text, p_seed int default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variations text[];
  v_hash text;
  v_cached record;
begin
  -- Check cache first
  v_hash := md5(p_pattern);
  select * into v_cached from public.spintax_cache where pattern_hash = v_hash;
  
  if found then
    v_variations := v_cached.variations;
  else
    v_variations := public.parse_spintax(p_pattern);
    insert into public.spintax_cache (pattern_hash, pattern, variations, variation_count)
    values (v_hash, p_pattern, v_variations, array_length(v_variations, 1))
    on conflict (pattern_hash) do nothing;
  end if;
  
  if array_length(v_variations, 1) = 1 then
    return v_variations[1];
  end if;
  
  if p_seed is not null then
    return v_variations[(p_seed % array_length(v_variations, 1)) + 1];
  else
    return v_variations[floor(random() * array_length(v_variations, 1)) + 1];
  end if;
exception
  when others then
    return p_pattern;
end;
$$;

grant execute on function public.render_spintax(text, int) to authenticated, service_role;
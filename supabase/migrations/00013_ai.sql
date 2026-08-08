-- ------------------------------------------------------------------
-- Export OS - 00013: AI Assistant, AI usage
-- ------------------------------------------------------------------

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function set_updated_at();

create index idx_ai_conversations_org on public.ai_conversations (organization_id);
create index idx_ai_conversations_user on public.ai_conversations (user_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role public.ai_message_role not null,
  content text not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  provider public.ai_provider,
  created_at timestamptz not null default now()
);

create index idx_ai_messages_org on public.ai_messages (organization_id);
create index idx_ai_messages_conversation on public.ai_messages (conversation_id);

create table public.ai_prompts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'general',
  is_favorite boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_ai_prompts_updated_at before update on public.ai_prompts
  for each row execute function set_updated_at();

create index idx_ai_prompts_org on public.ai_prompts (organization_id);

-- AI usage accounting (per org, per month)
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  month text not null,
  provider public.ai_provider not null default 'openai',
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  requests int not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, month, provider)
);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_prompts enable row level security;
alter table public.ai_usage enable row level security;

create policy ai_conversations_select_org on public.ai_conversations
  for select using (public.is_org_member(organization_id));
create policy ai_conversations_insert_org on public.ai_conversations
  for insert with check (public.is_org_member(organization_id));
create policy ai_conversations_update_org on public.ai_conversations
  for update using (public.is_org_member(organization_id));
create policy ai_conversations_delete_org on public.ai_conversations
  for delete using (public.is_org_member(organization_id));

create policy ai_messages_select_org on public.ai_messages
  for select using (public.is_org_member(organization_id));
create policy ai_messages_insert_org on public.ai_messages
  for insert with check (public.is_org_member(organization_id));
create policy ai_messages_delete_org on public.ai_messages
  for delete using (public.is_org_member(organization_id));

create policy ai_prompts_select_org on public.ai_prompts
  for select using (public.is_org_member(organization_id));
create policy ai_prompts_insert_org on public.ai_prompts
  for insert with check (public.is_org_member(organization_id));
create policy ai_prompts_update_org on public.ai_prompts
  for update using (public.is_org_member(organization_id));
create policy ai_prompts_delete_org on public.ai_prompts
  for delete using (public.is_org_member(organization_id));

create policy ai_usage_select_org on public.ai_usage
  for select using (public.is_org_member(organization_id));

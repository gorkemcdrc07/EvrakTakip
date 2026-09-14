-- ODAK Evrak Takip - Operasyon Merkezi v55
-- Supabase SQL Editor'da bir kez çalıştırın.
create extension if not exists pgcrypto;

alter table if exists public.hedef_kargo add column if not exists beklenen_teslim_tarihi date;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info',
  title text not null,
  message text,
  target_username text,
  target_role text,
  source_type text,
  source_id text,
  action_path text,
  priority text not null default 'normal',
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create table if not exists public.app_notification_reads (
  notification_id uuid references public.app_notifications(id) on delete cascade,
  username text not null,
  read_at timestamptz not null default now(),
  primary key(notification_id, username)
);
create table if not exists public.app_read_items (
  item_key text not null,
  username text not null,
  read_at timestamptz not null default now(),
  primary key(item_key, username)
);
create table if not exists public.app_notification_preferences (
  username text primary key,
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text unique,
  title text not null,
  description text,
  source_type text,
  source_id text,
  action_path text,
  priority text not null default 'normal',
  due_date date,
  status text not null default 'open' check(status in ('open','in_progress','done','cancelled')),
  assigned_to text,
  created_by text default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists public.app_audit_logs (
  id bigint generated always as identity primary key,
  username text,
  display_name text,
  action text not null,
  entity_type text,
  entity_id text,
  screen_path text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.app_user_activity (
  username text primary key,
  display_name text,
  role text,
  last_login_at timestamptz,
  last_seen_at timestamptz,
  last_action_at timestamptz,
  today_action_count integer not null default 0,
  action_count_date date default current_date,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target_type text not null default 'all' check(target_type in ('all','user','role')),
  target_value text,
  priority text not null default 'normal',
  action_path text,
  created_by text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.app_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_type text not null default 'other',
  description text,
  action_path text,
  source_id text,
  created_by text,
  created_at timestamptz not null default now()
);
create table if not exists public.app_report_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  frequency text not null default 'weekly' check(frequency in ('daily','weekly')),
  weekday integer default 1,
  hour integer not null default 8 check(hour between 0 and 23),
  recipients text[] not null default '{}',
  include_kargo boolean not null default true,
  include_evrak boolean not null default true,
  include_tahakkuk boolean not null default true,
  active boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_notifications_target on public.app_notifications(target_username,target_role,created_at desc);
create index if not exists idx_app_tasks_status on public.app_tasks(status,due_date);
create index if not exists idx_app_audit_created on public.app_audit_logs(created_at desc);
create index if not exists idx_calendar_date on public.app_calendar_events(event_date);
create index if not exists idx_report_active on public.app_report_schedules(active,next_run_at);

alter table public.app_notifications enable row level security;
alter table public.app_notification_reads enable row level security;
alter table public.app_notification_preferences enable row level security;
alter table public.app_tasks enable row level security;
alter table public.app_audit_logs enable row level security;
alter table public.app_user_activity enable row level security;
alter table public.app_announcements enable row level security;
alter table public.app_calendar_events enable row level security;
alter table public.app_report_schedules enable row level security;

-- Mevcut uygulama Supabase Auth yerine özel login tablosu kullandığı için
-- anon/authenticated erişim açık tutulur. Gerçek DB-seviyesi kullanıcı izolasyonu için Auth/JWT geçişi gerekir.
do $$
declare t text;
begin
  foreach t in array array['app_notifications','app_notification_reads','app_read_items','app_notification_preferences','app_tasks','app_audit_logs','app_user_activity','app_announcements','app_calendar_events','app_report_schedules']
  loop
    execute format('drop policy if exists "ets_%s_all" on public.%I', t, t);
    execute format('create policy "ets_%s_all" on public.%I for all to anon, authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['app_notifications','app_notification_reads','app_read_items','app_notification_preferences','app_tasks','app_audit_logs','app_user_activity','app_announcements','app_calendar_events','app_report_schedules']
  loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

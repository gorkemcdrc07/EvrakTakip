-- v56 Bildirim tercihleri
-- v55 OPERATIONS_HUB_SETUP.sql daha önce çalıştırıldıysa yalnızca bu dosyayı çalıştırmanız yeterlidir.

create table if not exists public.app_notification_preferences (
  username text primary key,
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_notification_preferences enable row level security;

drop policy if exists "ets_app_notification_preferences_all" on public.app_notification_preferences;
create policy "ets_app_notification_preferences_all"
on public.app_notification_preferences
for all to anon, authenticated
using (true)
with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.app_notification_preferences;
  exception when duplicate_object then null;
  end;
end $$;

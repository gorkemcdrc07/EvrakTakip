-- Ticket sahibi bildirimleri için gerekli erişim + Realtime düzeltmesi.
-- Supabase > SQL Editor'da BİR KEZ çalıştırın.

alter table public.app_notifications enable row level security;

drop policy if exists "ets_app_notifications_all" on public.app_notifications;
create policy "ets_app_notifications_all"
on public.app_notifications
for all
to anon, authenticated
using (true)
with check (true);

-- Realtime publication'a daha önce eklenmediyse ekle.
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_notifications;
  exception when duplicate_object then null;
  end;
end $$;

create index if not exists idx_app_notifications_ticket_recipient
on public.app_notifications (target_username, source_type, created_at desc);

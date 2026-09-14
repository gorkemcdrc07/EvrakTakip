-- Evrak Takip Sistemi / Ticket altyapısı
-- Supabase SQL Editor'de bir kez çalıştırın.

create extension if not exists pgcrypto;

create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    ticket_no text not null unique,
    title text not null,
    category text not null default 'Teknik Sorun',
    priority text not null default 'Normal',
    description text not null,
    status text not null default 'new',
    created_by_username text not null,
    created_by_name text,
    screen_path text,
    screen_title text,
    screenshot_urls text[] not null default '{}',
    admin_note text,
    assigned_admin text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint support_tickets_status_check check (status in ('new','reviewing','resolved','closed')),
    constraint support_tickets_priority_check check (priority in ('Düşük','Normal','Yüksek','Acil'))
);

create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_created_by_username_idx on public.support_tickets(created_by_username);
create index if not exists support_tickets_updated_at_idx on public.support_tickets(updated_at desc);

-- Storage bucket: ekran görüntüleri.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'ticket-attachments',
    'ticket-attachments',
    true,
    6291456,
    array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Mevcut uygulama kendi login tablosunu/localStorage oturumunu kullandığı için
-- Supabase Auth kimliği yok. Bu politikalar mevcut uygulamanın çalışabilmesi için
-- anon istemciye erişim verir. Admin ekranı uygulamada yalnızca username=admin için gösterilir.
-- Gerçek DB-seviyesi admin güvenliği için login yapısını Supabase Auth'a taşımak gerekir.
alter table public.support_tickets enable row level security;

DROP POLICY IF EXISTS "ticket_read_app" ON public.support_tickets;
DROP POLICY IF EXISTS "ticket_insert_app" ON public.support_tickets;
DROP POLICY IF EXISTS "ticket_update_app" ON public.support_tickets;
DROP POLICY IF EXISTS "ticket_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "ticket_storage_insert" ON storage.objects;

create policy "ticket_read_app"
on public.support_tickets for select
to anon, authenticated
using (true);

create policy "ticket_insert_app"
on public.support_tickets for insert
to anon, authenticated
with check (true);

create policy "ticket_update_app"
on public.support_tickets for update
to anon, authenticated
using (true)
with check (true);

create policy "ticket_storage_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'ticket-attachments');

create policy "ticket_storage_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'ticket-attachments');

-- Realtime bildirim için support_tickets tablosunu publication'a ekle.
do $$
begin
    alter publication supabase_realtime add table public.support_tickets;
exception
    when duplicate_object then null;
end $$;

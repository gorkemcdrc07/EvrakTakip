-- Ticket V2 / mevcut kuruluma canlı chat ve takip zamanları ekler.
alter table public.support_tickets add column if not exists seen_at timestamptz;
alter table public.support_tickets add column if not exists started_at timestamptz;
alter table public.support_tickets add column if not exists resolved_at timestamptz;
alter table public.support_tickets add column if not exists last_user_message_at timestamptz;
alter table public.support_tickets add column if not exists last_admin_message_at timestamptz;
alter table public.support_tickets drop constraint if exists support_tickets_status_check;
alter table public.support_tickets add constraint support_tickets_status_check check (status in ('new','reviewing','in_progress','resolved','closed'));
create table if not exists public.support_ticket_messages (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 sender_role text not null check (sender_role in ('user','admin')), sender_username text not null, sender_name text,
 message text not null check (char_length(message) between 1 and 3000), created_at timestamptz not null default now()
);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages(ticket_id, created_at);
alter table public.support_ticket_messages enable row level security;
drop policy if exists "ticket_messages_read_app" on public.support_ticket_messages;
drop policy if exists "ticket_messages_insert_app" on public.support_ticket_messages;
create policy "ticket_messages_read_app" on public.support_ticket_messages for select to anon, authenticated using (true);
create policy "ticket_messages_insert_app" on public.support_ticket_messages for insert to anon, authenticated with check (true);
do $$ begin alter publication supabase_realtime add table public.support_ticket_messages; exception when duplicate_object then null; end $$;

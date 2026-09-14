-- =============================================================
-- ETS / ODAK LOJİSTİK - KULLANICI & YETKİ YÖNETİMİ
-- Supabase SQL Editor'da bir kez çalıştırın.
-- =============================================================

create table if not exists public.app_user_access (
    username text primary key,
    role text not null default 'user',
    active boolean not null default true,
    screen_permissions jsonb not null default '{}'::jsonb,
    action_permissions jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create index if not exists idx_app_user_access_active on public.app_user_access(active);
create index if not exists idx_app_user_access_role on public.app_user_access(role);

-- Mevcut uygulama Supabase Auth yerine public.login + localStorage kullandığı için
-- bu tablo da aynı istemci mimarisiyle okunup yazılır.
-- Bu nedenle aşağıdaki politikalar uygulamayı çalıştırır ancak gerçek güvenlik sınırı değildir.
alter table public.app_user_access enable row level security;

drop policy if exists "app_user_access_select" on public.app_user_access;
create policy "app_user_access_select" on public.app_user_access
for select to anon, authenticated using (true);

drop policy if exists "app_user_access_insert" on public.app_user_access;
create policy "app_user_access_insert" on public.app_user_access
for insert to anon, authenticated with check (true);

drop policy if exists "app_user_access_update" on public.app_user_access;
create policy "app_user_access_update" on public.app_user_access
for update to anon, authenticated using (true) with check (true);

drop policy if exists "app_user_access_delete" on public.app_user_access;
create policy "app_user_access_delete" on public.app_user_access
for delete to anon, authenticated using (true);

-- Realtime ile kullanıcı yetki değişikliğinin açık oturuma da düşebilmesi için.
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'app_user_access'
    ) then
        alter publication supabase_realtime add table public.app_user_access;
    end if;
end $$;

-- Ana admin için kayıt. Yetki sistemi kod tarafında da admin'e tam erişim verir.
insert into public.app_user_access(username, role, active, screen_permissions, action_permissions)
values ('admin', 'admin', true, '{}'::jsonb, '{}'::jsonb)
on conflict (username) do update
set role = 'admin', active = true, updated_at = now();

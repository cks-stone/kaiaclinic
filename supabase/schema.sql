create extension if not exists pgcrypto;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_ids integer[] not null default '{}',
  service_names jsonb not null default '[]'::jsonb,
  estimated_total integer not null default 0 check (estimated_total >= 0),
  appointment_date date not null,
  appointment_time text not null,
  doctor_consultation text not null check (doctor_consultation in ('yes', 'no')),
  sedation text not null check (sedation in ('yes', 'no')),
  name text not null check (char_length(name) between 1 and 100),
  email text,
  phone text not null check (char_length(phone) between 7 and 30),
  note text,
  locale text not null default 'ko' check (locale in ('ko', 'zh-TW', 'en', 'ja')),
  privacy_agreed boolean not null default false check (privacy_agreed = true),
  payment_status text not null default 'PAY_ON_VISIT' check (payment_status = 'PAY_ON_VISIT'),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.appointments enable row level security;
alter table public.appointments add column if not exists estimated_total integer not null default 0;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;

drop policy if exists "admins can read own membership" on public.admin_users;
create policy "admins can read own membership"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- Anonymous visitors may submit a request, but cannot read or modify appointments.
drop policy if exists "public can create appointment requests" on public.appointments;
create policy "public can create appointment requests"
  on public.appointments for insert
  to anon, authenticated
  with check (privacy_agreed = true and payment_status = 'PAY_ON_VISIT' and status = 'REQUESTED');

revoke select, update, delete on public.appointments from anon, authenticated;
grant insert on public.appointments to anon, authenticated;
grant select, update on public.appointments to authenticated;

drop policy if exists "admins can view appointments" on public.appointments;
create policy "admins can view appointments"
  on public.appointments for select
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update appointments" on public.appointments;
create policy "admins can update appointments"
  on public.appointments for update
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception
  when duplicate_object then null;
end $$;

-- Never put the Supabase service_role key in VITE_* variables or the browser.

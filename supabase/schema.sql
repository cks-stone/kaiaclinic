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
  phone text check (phone is null or char_length(phone) between 7 and 30),
  country_code text not null default '+82',
  sns_platform text,
  sns_account text,
  note text,
  locale text not null default 'ko' check (locale in ('ko', 'zh-TW', 'en', 'ja')),
  privacy_agreed boolean not null default false check (privacy_agreed = true),
  payment_status text not null default 'PAY_ON_VISIT' check (payment_status = 'PAY_ON_VISIT'),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.appointments enable row level security;
alter table public.appointments add column if not exists estimated_total integer not null default 0;
alter table public.appointments add column if not exists country_code text not null default '+82';
alter table public.appointments add column if not exists sns_platform text;
alter table public.appointments add column if not exists sns_account text;
alter table public.appointments alter column phone drop not null;
alter table public.appointments drop constraint if exists appointments_phone_check;
alter table public.appointments add constraint appointments_contact_check check (nullif(phone, '') is not null or nullif(sns_account, '') is not null);

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

create table if not exists public.services (
  id integer primary key,
  category text not null check (category in ('signature', 'lifting', 'skin', 'body')),
  name jsonb not null,
  description jsonb not null,
  price integer not null check (price >= 0),
  duration integer not null check (duration > 0),
  tag text,
  image text,
  sort integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.services enable row level security;

drop policy if exists "anyone can view services" on public.services;
create policy "anyone can view services"
  on public.services for select
  to anon, authenticated
  using (true);

drop policy if exists "admins can insert services" on public.services;
create policy "admins can insert services"
  on public.services for insert
  to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update services" on public.services;
create policy "admins can update services"
  on public.services for update
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can delete services" on public.services;
create policy "admins can delete services"
  on public.services for delete
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

alter table public.services add column if not exists image text;

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  position jsonb not null,
  image text,
  sort integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.doctors enable row level security;

drop policy if exists "anyone can view doctors" on public.doctors;
create policy "anyone can view doctors"
  on public.doctors for select
  to anon, authenticated
  using (true);

drop policy if exists "admins can insert doctors" on public.doctors;
create policy "admins can insert doctors"
  on public.doctors for insert
  to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update doctors" on public.doctors;
create policy "admins can update doctors"
  on public.doctors for update
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can delete doctors" on public.doctors;
create policy "admins can delete doctors"
  on public.doctors for delete
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

grant select on public.doctors to anon, authenticated;
grant insert, update, delete on public.doctors to authenticated;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text,
  image text,
  content_path text,
  title_i18n jsonb,
  tag_i18n jsonb,
  content_paths jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.posts enable row level security;

drop policy if exists "anyone can view posts" on public.posts;
create policy "anyone can view posts"
  on public.posts for select
  to anon, authenticated
  using (true);

drop policy if exists "admins can insert posts" on public.posts;
create policy "admins can insert posts"
  on public.posts for insert
  to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update posts" on public.posts;
create policy "admins can update posts"
  on public.posts for update
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can delete posts" on public.posts;
create policy "admins can delete posts"
  on public.posts for delete
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

insert into storage.buckets (id, name, public) values ('service-images', 'service-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public can view service images" on storage.objects;
create policy "public can view service images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'service-images');

drop policy if exists "admins can upload service images" on storage.objects;
create policy "admins can upload service images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'service-images' and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update service images" on storage.objects;
create policy "admins can update service images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'service-images' and exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (bucket_id = 'service-images' and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can delete service images" on storage.objects;
create policy "admins can delete service images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'service-images' and exists (select 1 from public.admin_users where user_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('blog-assets', 'blog-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public can view blog assets" on storage.objects;
create policy "public can view blog assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-assets');

drop policy if exists "admins can upload blog assets" on storage.objects;
create policy "admins can upload blog assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update blog assets" on storage.objects;
create policy "admins can update blog assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (bucket_id = 'blog-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can delete blog assets" on storage.objects;
create policy "admins can delete blog assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-assets' and exists (select 1 from public.admin_users where user_id = auth.uid()));

insert into public.services (id, category, name, description, price, duration, tag, sort) values
(1, 'signature', '{"ko":"카이아 리프팅","zh-TW":"KAIA 拉提療程","en":"Kaia Lifting","ja":"カイアリフティング"}'::jsonb, '{"ko":"탄력과 윤곽을 한 번에 정돈하는 집중 케어","zh-TW":"改善肌膚彈性與輪廓的集中護理","en":"Focused care for contour and skin elasticity","ja":"ハリと輪郭を整える集中ケア"}'::jsonb, 320000, 50, 'BEST', 1),
(2, 'signature', '{"ko":"카이아 스킨부스터","zh-TW":"KAIA 水光療程","en":"Kaia Skin Booster","ja":"カイアスキンブースター"}'::jsonb, '{"ko":"피부 본연의 빛을 깨우는 수분 광채 케어","zh-TW":"喚醒肌膚自然光澤的保濕護理","en":"Hydrating care that restores your natural glow","ja":"肌本来の輝きを引き出す保湿ケア"}'::jsonb, 180000, 40, 'NEW', 2),
(3, 'lifting', '{"ko":"울쎄라 리프팅","zh-TW":"Ulthera 拉提","en":"Ulthera Lifting","ja":"ウルセラリフティング"}'::jsonb, '{"ko":"깊은 층부터 채워지는 자연스러운 리프팅","zh-TW":"從肌膚深層開始改善的自然拉提","en":"Natural lifting that begins deep within the skin","ja":"肌の深層から整える自然なリフトアップ"}'::jsonb, 890000, 60, null, 3),
(4, 'lifting', '{"ko":"인모드 FX","zh-TW":"InMode FX","en":"InMode FX","ja":"インモード FX"}'::jsonb, '{"ko":"페이스라인 지방과 탄력을 동시에 케어","zh-TW":"同時改善臉部線條與肌膚彈性","en":"Care for facial contour and firmness at once","ja":"フェイスラインとハリを同時にケア"}'::jsonb, 240000, 30, null, 4),
(5, 'skin', '{"ko":"리쥬란 힐러","zh-TW":"麗珠蘭修復療程","en":"Rejuran Healer","ja":"リジュランヒーラー"}'::jsonb, '{"ko":"지친 피부 컨디션을 되돌리는 피부 재생 케어","zh-TW":"恢復疲憊肌膚狀態的修復護理","en":"Skin renewal care for tired, stressed skin","ja":"疲れた肌を整える肌再生ケア"}'::jsonb, 280000, 40, null, 5),
(6, 'skin', '{"ko":"물광주사","zh-TW":"水光注射","en":"Glow Injection","ja":"水光注射"}'::jsonb, '{"ko":"건조함 없이 오래가는 촉촉한 피부결","zh-TW":"長效維持水潤肌膚質感","en":"Long-lasting hydration for a smooth complexion","ja":"長く続くみずみずしい肌質へ"}'::jsonb, 160000, 30, null, 6),
(7, 'skin', '{"ko":"쥬베룩 스킨","zh-TW":"Juvelook 肌膚療程","en":"Juvelook Skin","ja":"ジュベルックスキン"}'::jsonb, '{"ko":"피부결과 잔주름을 위한 콜라겐 케어","zh-TW":"改善膚質與細紋的膠原蛋白護理","en":"Collagen care for texture and fine lines","ja":"肌質と細かいシワのためのケア"}'::jsonb, 220000, 40, null, 7),
(8, 'body', '{"ko":"레이저 제모","zh-TW":"雷射除毛","en":"Laser Hair Removal","ja":"レーザー脱毛"}'::jsonb, '{"ko":"부위별 피부 상태를 고려한 편안한 제모","zh-TW":"依部位與膚況提供舒適除毛","en":"Comfortable hair removal tailored to each area","ja":"部位別の肌状態に合わせた脱毛"}'::jsonb, 80000, 20, null, 8)
on conflict (id) do nothing;

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

-- Event popups shown on site entry (images uploaded to the service-images bucket with a popup- prefix)
create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image text not null,
  link text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.popups enable row level security;

drop policy if exists "anyone can view popups" on public.popups;
create policy "anyone can view popups"
  on public.popups for select
  to anon, authenticated
  using (true);

drop policy if exists "admins can insert popups" on public.popups;
create policy "admins can insert popups"
  on public.popups for insert
  to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can update popups" on public.popups;
create policy "admins can update popups"
  on public.popups for update
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "admins can delete popups" on public.popups;
create policy "admins can delete popups"
  on public.popups for delete
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

grant select on public.popups to anon, authenticated;
grant insert, update, delete on public.popups to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception
  when duplicate_object then null;
end $$;

alter table public.appointments replica identity full;

-- Never put the Supabase service_role key in VITE_* variables or the browser.

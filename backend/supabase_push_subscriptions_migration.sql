-- ============================================
-- Migration: Push Subscriptions Table
-- Run this in Supabase SQL Editor (safe/idempotent)
-- ============================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  subscription jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'Users can view own push subscriptions'
  ) then
    create policy "Users can view own push subscriptions"
      on push_subscriptions for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'Users can create own push subscriptions'
  ) then
    create policy "Users can create own push subscriptions"
      on push_subscriptions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'Users can update own push subscriptions'
  ) then
    create policy "Users can update own push subscriptions"
      on push_subscriptions for update using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_push_subscriptions_user_id
  on push_subscriptions(user_id);

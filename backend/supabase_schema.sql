-- ============================================
-- Healthcare Chatbot — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- 1. Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  last_active timestamptz default now(),
  is_active boolean default true
);

-- 2. Messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  emotion text,
  symptoms text[] default '{}',
  severity text check (severity in ('low', 'medium', 'high', 'emergency', null)),
  conditions text[] default '{}',
  created_at timestamptz default now()
);

-- 3. Health Records table (aggregated from conversations)
create table if not exists health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  symptoms text[] default '{}',
  conditions text[] default '{}',
  severity text check (severity in ('low', 'medium', 'high', 'emergency', null)),
  emotion text,
  created_at timestamptz default now()
);

-- 4. Reminders table
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  medicine text not null,
  dosage text,
  time time not null,
  frequency text not null default 'daily',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. Push Subscriptions table
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  subscription jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS) — users can only access their own data
-- ============================================

alter table conversations enable row level security;
alter table messages enable row level security;
alter table health_records enable row level security;
alter table reminders enable row level security;
alter table push_subscriptions enable row level security;

-- Conversations: users see only their own
create policy "Users can view own conversations"
  on conversations for select using (auth.uid() = user_id);
create policy "Users can create own conversations"
  on conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations"
  on conversations for update using (auth.uid() = user_id);

-- Messages: users see messages in their conversations
create policy "Users can view messages in own conversations"
  on messages for select using (
    conversation_id in (select id from conversations where user_id = auth.uid())
  );
create policy "Users can insert messages in own conversations"
  on messages for insert with check (
    conversation_id in (select id from conversations where user_id = auth.uid())
  );

-- Health Records: users see only their own
create policy "Users can view own health records"
  on health_records for select using (auth.uid() = user_id);
create policy "Users can create own health records"
  on health_records for insert with check (auth.uid() = user_id);

-- Reminders: users manage only their own
create policy "Users can view own reminders"
  on reminders for select using (auth.uid() = user_id);
create policy "Users can create own reminders"
  on reminders for insert with check (auth.uid() = user_id);
create policy "Users can update own reminders"
  on reminders for update using (auth.uid() = user_id);

-- Push subscriptions: users manage only their own
create policy "Users can view own push subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can create own push subscriptions"
  on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own push subscriptions"
  on push_subscriptions for update using (auth.uid() = user_id);

-- ============================================
-- Indexes for performance
-- ============================================

create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_health_records_user_id on health_records(user_id);
create index if not exists idx_reminders_user_id on reminders(user_id);
create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

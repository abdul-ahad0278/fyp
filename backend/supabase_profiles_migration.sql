-- ============================================
-- User Profiles Migration
-- Adds structured health profile required before chat access.
-- Run in Supabase SQL Editor after supabase_schema.sql.
-- ============================================

create table if not exists user_profiles (
user_id uuid primary key references auth.users(id) on delete cascade,
full_name text,
age int check (age > 0 and age < 130),
gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
blood_group text,
height_cm numeric,
weight_kg numeric,
allergies text[] default '{}',
chronic_conditions text[] default '{}',
current_medications text[] default '{}',
previous_symptoms text,
family_history text,
lifestyle text,
is_complete boolean default false,
created_at timestamptz default now(),
updated_at timestamptz default now()
);

-- Vision analysis history (for the MediScan feature)
create table if not exists vision_analyses (
id uuid primary key default gen_random_uuid(),
user_id uuid references auth.users(id) on delete cascade,
mode text not null check (mode in ('symptom', 'medicine', 'prescription')),
user_note text,
detected_items text[] default '{}',
analysis text,
severity text check (severity in ('low', 'medium', 'high', 'emergency', null)),
recommendations text[] default '{}',
warnings text[] default '{}',
created_at timestamptz default now()
);

alter table user_profiles enable row level security;
alter table vision_analyses enable row level security;

create policy "Users manage own profile select"
on user_profiles for select using (auth.uid() = user_id);
create policy "Users manage own profile insert"
on user_profiles for insert with check (auth.uid() = user_id);
create policy "Users manage own profile update"
on user_profiles for update using (auth.uid() = user_id);

create policy "Users view own vision analyses"
on vision_analyses for select using (auth.uid() = user_id);
create policy "Users create own vision analyses"
on vision_analyses for insert with check (auth.uid() = user_id);

create index if not exists idx_vision_analyses_user_id on vision_analyses(user_id);

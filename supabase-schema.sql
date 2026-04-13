-- ============================================================
-- MONA INVEST — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  income                NUMERIC DEFAULT 0,
  fixed_expenses        NUMERIC DEFAULT 0,
  variable_expenses     NUMERIC DEFAULT 0,
  savings_buffer        NUMERIC DEFAULT 0,
  investment_mode       TEXT DEFAULT 'balanced' CHECK (investment_mode IN ('chill', 'balanced', 'ambitious')),
  monthly_budget        NUMERIC DEFAULT 300,
  goals                 TEXT[] DEFAULT '{}',
  plan                  TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  ia_credits            INTEGER DEFAULT 5,
  ia_credits_reset_date DATE DEFAULT CURRENT_DATE,
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: positions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.positions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL CHECK (platform IN ('pea', 'etoro')),
  ticker        TEXT NOT NULL,
  name          TEXT NOT NULL,
  quantity      NUMERIC NOT NULL DEFAULT 0,
  buy_price     NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC,
  buy_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: chat_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: feed_items (cached AI-generated feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feed_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         TEXT NOT NULL CHECK (type IN ('dividend', 'catalyst', 'signal')),
  ticker       TEXT,
  company_name TEXT,
  title        TEXT NOT NULL,
  description  TEXT,
  detail       TEXT,
  stats        JSONB DEFAULT '{}',
  platform     TEXT CHECK (platform IN ('pea', 'etoro', 'both')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items  ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Positions policies
CREATE POLICY "positions_select_own" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "positions_insert_own" ON public.positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_update_own" ON public.positions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "positions_delete_own" ON public.positions
  FOR DELETE USING (auth.uid() = user_id);

-- Chat history policies
CREATE POLICY "chat_select_own" ON public.chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_insert_own" ON public.chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_delete_own" ON public.chat_history
  FOR DELETE USING (auth.uid() = user_id);

-- Feed items: public read (shared cache)
CREATE POLICY "feed_select_all" ON public.feed_items
  FOR SELECT USING (true);

CREATE POLICY "feed_insert_any" ON public.feed_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "feed_delete_any" ON public.feed_items
  FOR DELETE USING (true);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_positions_user_id    ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_platform   ON public.positions(platform);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_expires_at      ON public.feed_items(expires_at);

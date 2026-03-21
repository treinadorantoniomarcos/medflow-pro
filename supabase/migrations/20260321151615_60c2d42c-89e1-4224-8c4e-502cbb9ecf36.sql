-- Add tutorial_state column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tutorial_state jsonb DEFAULT '{}'::jsonb;
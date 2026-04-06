-- Migration 000009: Fix function search_path to prevent search-path hijacking
-- Addresses Supabase security advisor warning: function_search_path_mutable

-- Fix handle_new_user (Auth trigger - retains SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix update_testimonials_updated_at
CREATE OR REPLACE FUNCTION public.update_testimonials_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

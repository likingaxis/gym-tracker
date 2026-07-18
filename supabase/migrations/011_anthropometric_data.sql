-- Migration: Add anthropometric data to app_profiles

ALTER TABLE app_profiles
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2);

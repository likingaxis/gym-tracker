-- Migration: Create body_weight_logs table

CREATE TABLE IF NOT EXISTS body_weight_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
    weight_kg numeric(5,2) NOT NULL,
    logged_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitate RLS
ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for select
CREATE POLICY "Users can view their own body weight logs"
    ON body_weight_logs FOR SELECT
    USING (auth.uid() = profile_id);

-- Create policy for insert
CREATE POLICY "Users can insert their own body weight logs"
    ON body_weight_logs FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- Create policy for update
CREATE POLICY "Users can update their own body weight logs"
    ON body_weight_logs FOR UPDATE
    USING (auth.uid() = profile_id);

-- Create policy for delete
CREATE POLICY "Users can delete their own body weight logs"
    ON body_weight_logs FOR DELETE
    USING (auth.uid() = profile_id);

-- Index for faster retrieval by profile
CREATE INDEX IF NOT EXISTS body_weight_logs_profile_id_idx ON body_weight_logs(profile_id);
CREATE INDEX IF NOT EXISTS body_weight_logs_logged_at_idx ON body_weight_logs(logged_at);

alter table app_profiles
add column if not exists pin_enabled boolean not null default false,
add column if not exists pin_hash text;

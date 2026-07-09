-- v0.11 pesi ultima volta + RPE target

alter table exercises
add column if not exists target_rpe text;

alter table exercise_sets
add column if not exists weight_source text not null default 'empty';

update exercise_sets
set weight_source = case
  when weight is null or trim(weight) = '' then 'empty'
  else 'manual'
end
where weight_source is null or weight_source = '';

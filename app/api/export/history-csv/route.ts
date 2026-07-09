import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

export async function GET() {
  const profileId = await getSelectedProfileId();

  if (!profileId) {
    return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("app_profiles")
    .select("id, name")
    .eq("id", profileId)
    .maybeSingle();

  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("*, workout_plans(name, month), workout_days(name), session_exercises(*, exercises(name, muscle_group, exercise_db_id), exercise_sets(*))")
    .eq("profile_id", profileId)
    .order("started_at", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = buildCsvRows(profile?.name ?? "Profilo", sessions ?? []);
  const csv = toCsv(rows);
  const fileName = `storico-${slugify(profile?.name ?? "profilo")}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store"
    }
  });
}

function buildCsvRows(profileName: string, sessions: any[]) {
  const rows: Record<string, string | number | boolean | null>[] = [];

  for (const session of sessions) {
    const sessionExercises = session.session_exercises ?? [];

    if (sessionExercises.length === 0) {
      rows.push(baseSessionRow(profileName, session));
      continue;
    }

    for (const sessionExercise of sessionExercises) {
      const sets = sessionExercise.exercise_sets ?? [];
      if (sets.length === 0) {
        rows.push({
          ...baseSessionRow(profileName, session),
          exercise_name: sessionExercise.exercises?.name ?? "",
          muscle_group: sessionExercise.exercises?.muscle_group ?? "",
          exercise_db_id: sessionExercise.exercises?.exercise_db_id ?? "",
          exercise_completed: sessionExercise.completed ?? false,
          personal_notes: sessionExercise.personal_notes ?? "",
          set_number: "",
          reps: "",
          weight: "",
          weight_source: "",
          rpe: "",
          set_completed: ""
        });
        continue;
      }

      for (const set of sets.sort((a: any, b: any) => Number(a.set_number ?? 0) - Number(b.set_number ?? 0))) {
        rows.push({
          ...baseSessionRow(profileName, session),
          exercise_name: sessionExercise.exercises?.name ?? "",
          muscle_group: sessionExercise.exercises?.muscle_group ?? "",
          exercise_db_id: sessionExercise.exercises?.exercise_db_id ?? "",
          exercise_completed: sessionExercise.completed ?? false,
          personal_notes: sessionExercise.personal_notes ?? "",
          set_number: set.set_number ?? "",
          reps: set.reps ?? "",
          weight: set.weight ?? "",
          weight_source: set.weight_source ?? "",
          rpe: set.rpe ?? "",
          set_completed: set.completed ?? false
        });
      }
    }
  }

  return rows;
}

function baseSessionRow(profileName: string, session: any) {
  return {
    profile: profileName,
    session_id: session.id,
    session_status: session.status,
    started_at: session.started_at,
    completed_at: session.completed_at ?? "",
    workout_plan: session.workout_plans?.name ?? "",
    workout_month: session.workout_plans?.month ?? "",
    workout_day: session.workout_days?.name ?? "",
    general_notes: session.general_notes ?? ""
  };
}

function toCsv(rows: Record<string, unknown>[]) {
  const headers = [
    "profile",
    "session_id",
    "session_status",
    "started_at",
    "completed_at",
    "workout_plan",
    "workout_month",
    "workout_day",
    "general_notes",
    "exercise_name",
    "muscle_group",
    "exercise_db_id",
    "exercise_completed",
    "personal_notes",
    "set_number",
    "reps",
    "weight",
    "weight_source",
    "rpe",
    "set_completed"
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }

  return `\ufeff${lines.join("\n")}`;
}

function escapeCsv(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "profilo";
}

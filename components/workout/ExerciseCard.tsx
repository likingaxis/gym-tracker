"use client";

import { useState } from "react";
import { CheckCircle2, PlayCircle, TimerReset } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Props = {
  exercise: {
    id?: string;
    name: string;
    muscle_group?: string | null;
    sets?: number | null;
    reps?: string | null;
    rest_seconds?: number | null;
    suggested_weight?: string | null;
    technique_notes?: string | null;
    tips?: string | null;
    video_url?: string | null;
    media_url?: string | null;
    exercise_db_query?: string | null;
    exercise_db_id?: string | null;
    exercise_db_name?: string | null;
    exercise_db_confidence?: string | null;
    exercise_db_match_status?: string | null;
    exercise_db_match_score?: number | null;
    trainer_notes?: string | null;
  };
};

export function ExerciseCard({ exercise }: Props) {
  const [completed, setCompleted] = useState(false);
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  function startTimer() {
    const total = exercise.rest_seconds ?? 60;
    setSecondsLeft(total);
    const interval = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (!value || value <= 1) {
          window.clearInterval(interval);
          if ("vibrate" in navigator) navigator.vibrate(250);
          return null;
        }
        return value - 1;
      });
    }, 1000);
  }

  return (
    <Card className={completed ? "border-gym-accent/70" : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gym-accent">{exercise.muscle_group ?? "Esercizio"}</p>
          <h3 className="mt-1 text-2xl font-black leading-tight">{exercise.name}</h3>
          <p className="mt-2 text-lg font-bold text-slate-200">
            {exercise.sets ?? "-"} serie x {exercise.reps ?? "-"}
          </p>
          <p className="text-sm text-gym-muted">Recupero: {exercise.rest_seconds ?? 60} sec</p>
          {exercise.suggested_weight ? <p className="text-sm text-gym-muted">Carico: {exercise.suggested_weight}</p> : null}
        </div>
        <button onClick={() => setCompleted((value) => !value)} className="rounded-full p-2 text-gym-accent">
          <CheckCircle2 size={32} fill={completed ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={startTimer} className="flex items-center justify-center gap-2 py-3 text-sm">
          <TimerReset size={18} /> {secondsLeft ? `${secondsLeft}s` : "Recupero"}
        </Button>
        {exercise.video_url ? (
          <a href={exercise.video_url} target="_blank" className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
            <PlayCircle size={18} /> Video
          </a>
        ) : (
          <button className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-500" disabled>Video</button>
        )}
      </div>

      <button onClick={() => setOpen((value) => !value)} className="mt-4 w-full rounded-2xl bg-black/20 p-3 text-left text-sm font-bold">
        {open ? "Nascondi consigli" : "Mostra consigli e tecnica"}
      </button>

      {open ? (
        <div className="mt-3 space-y-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">
          {exercise.technique_notes ? <p><strong>Tecnica:</strong> {exercise.technique_notes}</p> : null}
          {exercise.tips ? <p><strong>Consigli:</strong> {exercise.tips}</p> : null}
          {exercise.trainer_notes ? <p><strong>Note PT:</strong> {exercise.trainer_notes}</p> : null}
          {exercise.media_url ? (
            <div className="flex justify-center">
              <img
                src={exercise.media_url}
                alt={exercise.name}
                className="h-40 w-40 rounded-2xl object-contain sm:h-44 sm:w-44"
                loading="lazy"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

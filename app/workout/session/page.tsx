"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkoutSessionClient } from "@/components/workout/WorkoutSessionClient";
import { getWorkoutDayClient } from "@/lib/api-client/workout";

function WorkoutDayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayId = searchParams.get("dayId");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const profileId = localStorage.getItem("active_profile_id");
      if (!profileId) {
        router.push("/profiles");
        return;
      }
      if (!dayId) {
        router.push("/");
        return;
      }

      const result = await getWorkoutDayClient(profileId, dayId);
      setData(result);
      setLoading(false);
    }
    loadData();
  }, [dayId, router]);

  if (loading) return <div className="flex h-screen items-center justify-center text-gym-muted">Caricamento sessione...</div>;
  if (!data) return <p className="text-red-200">Giorno non trovato.</p>;

  return <WorkoutSessionClient day={data.day} durationEstimate={data.estimate} />;
}

export default function WorkoutDayPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gym-muted">Caricamento...</div>}>
      <WorkoutDayContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Profile = {
  id: string;
  name: string;
  avatar_emoji?: string | null;
  color?: string | null;
  pin_enabled?: boolean | null;
};

const AVATARS = ["🏋️", "💪", "🔥", "⚡", "🦾", "🥊"];

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function ProfileSelector({ initialProfiles }: { initialProfiles: Profile[] }) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [status, setStatus] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(initialProfiles.length === 0);
  const [pinProfile, setPinProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  function handleProfileClick(profile: Profile) {
    setStatus(undefined);
    if (profile.pin_enabled) {
      setPinProfile(profile);
      setPin("");
      return;
    }
    selectProfile(profile.id);
  }

  async function selectProfile(profileId: string, selectedPin?: string) {
    setIsSelecting(true);
    setStatus("Accesso al profilo...");
    const response = await fetch("/api/profiles/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile_id: profileId, pin: selectedPin }),
    });
    const data = await readJsonResponse(response);
    setIsSelecting(false);

    if (!response.ok) {
      setStatus(data?.error ?? "Impossibile selezionare il profilo.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function submitPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pinProfile) return;
    if (!/^\d{4}$/.test(pin)) {
      setStatus("Inserisci un PIN di 4 cifre.");
      return;
    }
    await selectProfile(pinProfile.id, pin);
  }

  async function createProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setStatus("Inserisci un nome profilo.");
      return;
    }

    setIsCreating(true);
    setStatus("Creazione profilo...");

    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: cleanName, avatar_emoji: avatar }),
    });
    const data = await readJsonResponse(response);

    setIsCreating(false);

    if (!response.ok) {
      setStatus(data?.error ?? "Impossibile creare il profilo.");
      return;
    }

    setName("");
    setProfiles((current) => [...current, data.profile]);
    setStatus(`Profilo ${data.profile.name} creato.`);
  }

  return (
    <div className="space-y-6">
      {profiles.length > 0 ? (
        <section className="grid grid-cols-2 gap-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleProfileClick(profile)}
              className="relative min-h-[116px] rounded-lg border border-gym-line bg-gym-panel p-4 text-left transition hover:border-gym-accent/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gym-accent"
            >
              {profile.pin_enabled ? (
                <span className="absolute right-3 top-3 rounded-lg border border-gym-line bg-gym-bg p-2 text-gym-accent">
                  <LockKeyhole size={16} />
                </span>
              ) : null}
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-2xl">
                {profile.avatar_emoji || "🏋️"}
              </div>
              <p className="mt-3 text-xl font-extrabold leading-none">{profile.name}</p>
            </button>
          ))}
        </section>
      ) : (
        <Card>
          <h2 className="text-xl font-black">Nessun profilo</h2>
          <p className="mt-2 text-gym-muted">
            Crea il primo profilo.
          </p>
        </Card>
      )}

      {pinProfile ? (
        <Card className="border-gym-accent/40">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-4xl">
              {pinProfile.avatar_emoji || "🏋️"}
            </div>
            <h2 className="mt-3 text-2xl font-black">{pinProfile.name}</h2>
            <p className="mt-1 text-sm text-gym-muted">Inserisci il PIN a 4 cifre.</p>
          </div>
          <form onSubmit={submitPin} className="mt-5 space-y-3">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoFocus
              type="password"
              placeholder="••••"
              className="w-full rounded-3xl border border-white/10 bg-black/30 px-4 py-4 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:border-gym-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinProfile(null);
                  setPin("");
                }}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-slate-200"
              >
                Annulla
              </button>
              <Button disabled={isSelecting || pin.length !== 4}>Entra</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {!showCreateForm ? (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="secondary-button w-full"
        >
          Aggiungi profilo
        </button>
      ) : (
      <Card>
        <h2 className="text-xl font-black">Aggiungi profilo</h2>
        <form onSubmit={createProfile} className="mt-4 space-y-4">
          <label className="block text-sm font-semibold text-slate-300">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Es. Luca"
              className="input mt-2"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-300">Avatar</p>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATARS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`rounded-lg border p-3 text-2xl ${
                    avatar === item ? "border-gym-accent bg-gym-accent/20" : "border-white/10 bg-black/20"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <Button disabled={isCreating} className="w-full">
            {isCreating ? "Creazione..." : "Crea profilo"}
          </Button>
        </form>
      </Card>
      )}

      {status ? <p className="rounded-lg border border-gym-line bg-gym-panel p-3 text-sm text-slate-200">{status}</p> : null}
    </div>
  );
}

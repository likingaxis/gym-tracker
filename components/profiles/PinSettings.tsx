"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type PinSettingsProps = {
  profile: {
    id: string;
    name: string;
    pin_enabled?: boolean | null;
  };
};

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanPin(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function PinSettings({ profile }: PinSettingsProps) {
  const router = useRouter();
  const [pinEnabled, setPinEnabled] = useState(Boolean(profile.pin_enabled));
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [removePin, setRemovePin] = useState("");
  const [status, setStatus] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function savePin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Salvataggio PIN...");

    const response = await fetch(`/api/profiles/${profile.id}/pin`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        current_pin: currentPin,
        new_pin: newPin,
        confirm_pin: confirmPin,
      }),
    });
    const data = await readJsonResponse(response);
    setIsSaving(false);

    if (!response.ok) {
      setStatus(data?.error ?? "Impossibile salvare il PIN.");
      return;
    }

    setPinEnabled(true);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setStatus("PIN salvato correttamente.");
    router.refresh();
  }

  async function deletePin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirm("Vuoi rimuovere il PIN da questo profilo?")) return;

    setIsSaving(true);
    setStatus("Rimozione PIN...");

    const response = await fetch(`/api/profiles/${profile.id}/pin`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current_pin: removePin }),
    });
    const data = await readJsonResponse(response);
    setIsSaving(false);

    if (!response.ok) {
      setStatus(data?.error ?? "Impossibile rimuovere il PIN.");
      return;
    }

    setPinEnabled(false);
    setRemovePin("");
    setStatus("PIN rimosso.");
    router.refresh();
  }

  async function lockProfile() {
    setStatus("Blocco profilo...");
    await fetch("/api/profiles/lock", { method: "POST" });
    router.push("/profiles");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm text-gym-muted">Stato PIN</p>
        <p className="mt-1 text-xl font-black">{pinEnabled ? "Attivo" : "Non attivo"}</p>
        <p className="mt-2 text-sm text-gym-muted">
          Il PIN protegge l’ingresso al profilo su questo dispositivo. È pensato come privacy semplice stile Netflix.
        </p>
      </div>

      <form onSubmit={savePin} className="space-y-3">
        <h3 className="text-lg font-black">{pinEnabled ? "Cambia PIN" : "Attiva PIN"}</h3>
        {pinEnabled ? (
          <PinInput label="PIN attuale" value={currentPin} onChange={setCurrentPin} />
        ) : null}
        <PinInput label="Nuovo PIN" value={newPin} onChange={setNewPin} />
        <PinInput label="Conferma nuovo PIN" value={confirmPin} onChange={setConfirmPin} />
        <Button disabled={isSaving || newPin.length !== 4 || confirmPin.length !== 4} className="w-full">
          {pinEnabled ? "Cambia PIN" : "Attiva PIN"}
        </Button>
      </form>

      {pinEnabled ? (
        <form onSubmit={deletePin} className="space-y-3 rounded-3xl border border-red-400/20 bg-red-950/20 p-4">
          <h3 className="text-lg font-black">Rimuovi PIN</h3>
          <PinInput label="PIN attuale" value={removePin} onChange={setRemovePin} />
          <button
            disabled={isSaving || removePin.length !== 4}
            className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            Rimuovi PIN
          </button>
        </form>
      ) : null}

      <button
        onClick={lockProfile}
        className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-slate-200"
      >
        Blocca profilo / cambia utente
      </button>

      {status ? <p className="rounded-2xl bg-white/10 p-3 text-sm text-slate-200">{status}</p> : null}
    </div>
  );
}

function PinInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(cleanPin(event.target.value))}
        inputMode="numeric"
        type="password"
        placeholder="••••"
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-white outline-none focus:border-gym-accent"
      />
    </label>
  );
}

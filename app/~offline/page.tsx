import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline - Gym Tracker",
};

export default function OfflinePage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-950 p-6 text-center text-white">
      <h1 className="mb-4 text-3xl font-bold text-red-500">Sei Offline</h1>
      <p className="mb-8 text-gray-400">
        Sembra che tu non abbia una connessione a Internet attiva.
      </p>
      <div className="rounded-xl bg-gray-900 p-6 shadow-lg border border-gray-800 w-full max-w-sm text-left">
        <h2 className="mb-2 text-xl font-semibold">Cosa puoi fare?</h2>
        <ul className="list-disc pl-5 text-gray-300 space-y-2">
          <li>Se sei in una sessione di allenamento, i dati verranno salvati localmente.</li>
          <li>Usa l'app normalmente; verrà sincronizzata quando tornerai online.</li>
          <li>Controlla la tua connessione e riprova se vuoi caricare nuove schede.</li>
        </ul>
      </div>
    </div>
  );
}

import Link from "next/link";
import { CloudOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <div className="rounded-full bg-amber-500/10 p-6 border border-amber-500/20 mb-6">
        <CloudOff size={56} className="text-amber-400" />
      </div>
      <h1 className="text-3xl font-extrabold text-white mb-2">Sei Offline</h1>
      <p className="text-sm font-medium text-gym-muted mb-8 max-w-xs">
        Non c'è connessione internet. Le schede e i dati completati in palestra sono comunque salvati al sicuro sul tuo dispositivo.
      </p>
      <Link
        href="/"
        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c65f37] to-[#ea580c] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(198,95,55,0.35)] transition-all active:scale-95"
      >
        Torna alla Home
      </Link>
    </div>
  );
}

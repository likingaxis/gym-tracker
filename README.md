# Gym Tracker App v0.18.3

PWA mobile-first per gestire schede palestra personali, allenamenti, storico, calendario, progressi, backup e profili con PIN.

## Novità v0.18.3

- Polish UI/UX visuale senza rimuovere funzionalità.
- Palette più leggibile e semantica:
  - verde per azioni positive e completamento;
  - blu per informazioni, timer e sessione attiva;
  - rosso per azioni distruttive;
  - superfici scure più differenziate.
- Card con varianti visive: default, primary, subtle, active, info, danger.
- Meno uso di titoli uppercase e `font-black`, per ridurre l'effetto "tutto urla".
- Bottom navigation nascosta durante la schermata allenamento attivo (`/workout/[dayId]`).
- Timer basso più pulito:
  - Pausa/Riprendi;
  - +15s;
  - Chiudi;
  - rimosso Reset timer dalla vista principale.
- Mini player sessione attiva meno verde e più elegante.
- Header progresso allenamento più compatto e meno ripetitivo.
- Registro serie ancora più minimale: riepilogo completate/da fare invece dei chip per ogni serie futura.
- Backup e zona pericolosa più leggibili a livello colore.
- GIF esercizi lasciate come in v0.18.1: compatte, centrate e non tagliate.

## Aggiornamento da v0.18.1

Copia i file sopra la tua cartella attuale senza cancellare:

- `node_modules`
- `.env.local`
- `package-lock.json`
- `.git`

Poi esegui:

```bash
npm run dev
```

Per pubblicare:

```bash
npm run build
git add .
git commit -m "v0.18.3 bottom nav and CTA separation"
git push
```

## Database

Nessuna nuova migration Supabase.

## Note

La v0.18.3 non cambia le logiche dati e non aggiunge nuove dipendenze.


## Fix v0.18.3

- Bottom navigation mantenuta visibile anche durante l'allenamento attivo.
- Timer basso spostato sopra la navbar per non sovrapporsi.
- CTA finale allenamento separata visivamente da `Completa serie`: ora usa stile info/outline e testo `Chiudi allenamento`.
- `Completa serie` resta l'unica CTA verde piena dentro la card esercizio.

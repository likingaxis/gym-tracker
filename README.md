# Gym Tracker App

`v0.17 — animazioni premium e smoothness`

PWA mobile-first per gestire schede palestra personali, import JSON, profili, PIN, timer recupero, storico, progressi, backup e calendario allenamenti.

## Novità v0.17

Questa versione non cambia il flusso dati e non rimuove funzionalità: aggiunge animazioni leggere e funzionali per rendere l’app più fluida, premium e piacevole da usare in palestra.

- Aggiunta dipendenza `framer-motion`.
- Transizione leggera tra le schermate principali.
- Bottom navigation più fluida:
  - feedback al tap;
  - stato attivo animato.
- Bottoni principali con micro feedback al tap.
- Card animate con layout transition leggera.
- Progress bar serie animata.
- Timer sticky animato:
  - entrata/uscita fluida;
  - stato finale più evidente;
  - controlli con feedback al tap.
- Card esercizio:
  - entrata morbida;
  - completamento/collasso più fluido;
  - focus della prossima serie più reattivo;
  - bottone “Completa serie” con feedback.
- Accordion animati per:
  - note;
  - tecnica;
  - consigli/dettagli.
- Supporto `prefers-reduced-motion` nei componenti principali:
  - se l’utente riduce le animazioni a livello sistema, l’app attenua o disattiva slide/scale.

## Dipendenza nuova

Questa versione richiede una nuova dipendenza:

```bash
npm install framer-motion
```

Se estrai il progetto in una cartella nuova, basta eseguire:

```bash
npm install
npm run dev
```

Se invece copi i file sopra la tua cartella fissa con `node_modules` già presente, esegui almeno:

```bash
npm install framer-motion
npm run dev
```

## Funzioni già presenti

- Profili utenti stile Netflix.
- PIN opzionale a 4 cifre per profilo.
- Import JSON scheda mensile.
- ExerciseDB by ID: se `exercise_db_id` è presente, la GIF viene generata da ID.
- Tracciamento allenamento per singola serie.
- Reps precompilate dal JSON.
- Pesi precompilati dall’ultima sessione completata.
- RPE target da JSON.
- Timer recupero con pausa/riprendi/reset, `+15s` e salta recupero.
- Card esercizio completata e collassabile.
- Storico sessioni con filtri.
- Vista calendario allenamenti.
- Progressi avanzati e analisi esercizi.
- Export storico CSV.
- Backup completo JSON.
- Reset dati profilo.

## Database

Se arrivi dalla v0.16, non serve nessuna nuova migration Supabase.

## Aggiornamento dalla v0.16

1. Chiudi `npm run dev`.
2. Copia i file della v0.17 sopra la cartella attuale senza cancellare:

```text
node_modules
.env.local
package-lock.json
```

3. Installa la nuova dipendenza:

```bash
npm install framer-motion
```

4. Riavvia:

```bash
npm run dev
```

## Note tecniche

- Le animazioni sono intenzionalmente brevi.
- Non ci sono animazioni decorative continue.
- Non sono stati aggiunti splash screen, confetti o effetti 3D.
- La priorità resta l’uso rapido in palestra.

## Prossima possibile versione

`v0.18` potrebbe essere dedicata a:

- import backup JSON;
- miglioramento grafici e record;
- rifinitura finale MVP;
- test e stabilizzazione verso `v1.0`.

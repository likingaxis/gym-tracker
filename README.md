# Gym Tracker App v0.18.1

Patch UI/UX per rendere più pulita la sessione attiva.

## Novità v0.18.1

- Rimossa dalla Home la card grande "Allenamento in corso": ora la sessione attiva vive nel mini player basso.
- Timer recupero trasformato in player basso sopra la bottom navigation.
- Header progresso nella sessione reso più compatto: giorno, serie, percentuale e stato salvataggio in una barra sottile.
- Nessuna funzionalità rimossa.
- Nessuna nuova migration Supabase.

---

# Gym Tracker App

## v0.18.1 - Mini player allenamento e card più compatta

Questa versione migliora l'uso reale durante l'allenamento senza modificare il database.

Novità principali:

- mini player persistente dell'allenamento in corso sopra la bottom navigation;
- tap sul mini player o icona play per riprendere subito la sessione;
- menu del mini player con azioni protette per completare o annullare la sessione;
- registro serie completate più compatto nella card esercizio;
- dettaglio serie completate apribile/chiudibile come accordion;
- timer recupero chiudibile con bottone `Chiudi`;
- chiusura timer senza modificare lo stato della serie o dell'allenamento;
- nessuna nuova migration Supabase.

Aggiornamento consigliato dalla v0.17.8:

```powershell
npm run build
git add .
git commit -m "v0.18 mini player allenamento"
git push
```


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

## v0.17.4 - Vercel build fix

Questa patch parte dalla v0.17 originale con Framer Motion e aggiunge:

- fix TypeScript per `app/api/workout-sessions/route.ts` durante `next build` su Vercel;
- `allowedDevOrigins` in `next.config.ts` per il test da telefono in rete locale;
- versione pacchetto aggiornata a `0.17.4`.

Nessuna migration Supabase richiesta.

## v0.17.6 - Fix relazioni Supabase nel build Vercel

Questa patch mantiene la v0.17 con animazioni e corregge altri errori TypeScript emersi durante `next build` su Vercel.

Correzioni:

- gestione compatibile delle relazioni Supabase che in TypeScript possono essere viste come array;
- fix per `workout_days`, `workout_plans` ed `exercises` nelle pagine Home, Storico, Calendario, dettaglio sessione ed export CSV;
- aggiunto helper `lib/relations.ts` con `firstRelation` e `relationName`;
- versione pacchetto aggiornata a `0.17.6`.

Database: nessuna nuova migration.


## v0.17.7 - GIF non tagliate

- Corretto il rendering delle GIF/foto esercizio su mobile.
- Le immagini usano `object-contain` invece di `object-cover`, quindi non vengono piu tagliate a meta.
- Aumentata leggermente l'altezza massima del box media nella card allenamento.
- Nessuna nuova dipendenza e nessuna nuova migration Supabase.


## v0.17.8 - GIF ExerciseDB compatte 180x180

- Ridimensionato il box GIF per rispettare meglio il formato ExerciseDB, circa 180x180.
- Le GIF ora sono centrate in un riquadro compatto invece di occupare tutta la larghezza della card.
- Rimossi sfondi neri/padding pesanti che creavano bande visive brutte.
- Nessuna nuova dipendenza e nessuna nuova migration Supabase.
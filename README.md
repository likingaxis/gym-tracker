# Gym Tracker App v0.26.0

PWA mobile-first per gestire schede palestra personali con profili, import scheda, allenamento guidato, storico, progressi, timer, backup, editor scheda e gestione multi-scheda.

## Focus v0.26.0

Questa versione migliora la parte multi-scheda introdotta nella v0.25.0 e la rende piu' visibile in storico, calendario e archivio.

Novita principali:

- filtro storico per singola scheda;
- storico con chip scheda attiva/archiviata e pallino colore;
- calendario filtrabile per scheda;
- calendario con legenda dinamica basata sulle schede realmente presenti nel mese;
- dettaglio giorno calendario con scheda, giorno e metriche;
- archivio schede diviso tra attiva e archiviate;
- archivio con conteggio sessioni completate, aperte e nel cestino per ogni scheda;
- link rapidi da archivio a storico e calendario della singola scheda.

## Migrazioni

Nessuna nuova migration rispetto alla v0.25.2.

Servono comunque le migration gia' introdotte prima:

```sql
supabase/migrations/009_workout_plan_history.sql
supabase/migrations/010_session_trash_pause.sql
```

## Aggiornamento

Copia questa versione sopra la cartella attuale senza cancellare:

```text
node_modules
.env.local
package-lock.json
.git
```

Poi:

```powershell
npm run dev
```

Se tutto funziona:

```powershell
npm run build
git add .
git commit -m "v0.26.0 multi plan history calendar"
git push
```

---

# Gym Tracker App v0.25.1

PWA mobile-first per gestire schede palestra personali con profili, import scheda, allenamento guidato, storico, progressi, timer e backup.

## Focus v0.25.1

Questa versione introduce la base per gestire più schede nel tempo:

- una scheda attiva per profilo;
- schede precedenti archiviate invece che eliminate;
- date, status e colore per ogni scheda;
- snapshot su ogni sessione per conservare nome scheda e nome giorno originali;
- storico e calendario con indicatore della scheda usata;
- nuova pagina Archivio schede.

Prima di usare questa versione su Supabase eseguire la migration:

```sql
supabase/migrations/009_workout_plan_history.sql
```


## Novita v0.25.1

Questa versione cambia di nuovo la strategia dell'import AI: non passa piu' il CSV enorme completo a Gemini e non usa piu' il catalogo short della v0.23.4 come soluzione separata.

La nuova pipeline usa un vocabolario controllato ExerciseDB:

```text
Gemini legge la scheda del trainer
Gemini normalizza gli esercizi usando parole controllate ExerciseDB
Backend cerca candidati reali nel catalogo completo
Gemini sceglie solo tra candidati reali
Backend copia exercise_db_id e gifUrl dal catalogo ufficiale
Preview prima dell'import
Supabase salva solo dopo conferma utente
```

## Nuovi file dati

Sono inclusi i file del vocabulary pack:

```text
data/exercisedb-catalog.json
data/exercisedb-vocabulary.json
data/exercisedb-prompt-vocabulary.json
data/exercise-it-synonyms.json
data/exercisedb-index-compact.csv
```

Uso previsto:

```text
exercisedb-catalog.json
= catalogo completo usato dal backend come fonte ufficiale per ID e GIF

exercisedb-vocabulary.json
= vocabolario completo per matching/debug

exercisedb-prompt-vocabulary.json
= vocabolario compatto inserito nel prompt Gemini

exercise-it-synonyms.json
= sinonimi italiano -> termini ExerciseDB per espandere la ricerca backend
```

## Prompt controllato

Il prompt ora chiede a Gemini di usare termini simili o identici a ExerciseDB per:

```text
exercise_db_query
alternative_queries
equipment_hint
body_part_hint
target_muscle_hint
movement_pattern
variant_hints
position_hint
grip_hint
bench_angle_hint
side_hint
```

Esempi:

```text
Stacchi regular -> barbell deadlift
Lat pull down machine -> lever lat pulldown / lat pulldown
Tirate su panca a 30 gradi supino -> reverse grip incline bench row
Sitted calf machine -> lever seated calf raise
Leg curl -> lever lying leg curl / leg curl
```

Nella prima chiamata Gemini non deve compilare ID o URL: deve lasciare `exercise_db_id` e `media_url` vuoti. Il backend usera' query e hint per trovare candidati reali.

## Matching ExerciseDB

La logica e' prudente:

```text
1. Backend usa catalogo completo e sinonimi italiani.
2. Backend crea massimo 5-8 candidati reali per esercizio.
3. Gemini sceglie solo tra quei candidati.
4. Se Gemini risponde confidence high, il backend applica ID e GIF.
5. Se confidence medium/low, niente GIF automatica.
```

Regola fondamentale:

```text
Gemini interpreta.
Backend valida.
ExerciseDB fornisce ID e GIF ufficiali.
```

`media_url` viene sempre copiata da `gifUrl` del catalogo completo. Non viene mai accettata una URL inventata dal modello.

## Import AI

La pagina Import mantiene due modalita':

```text
Genera con AI
Importa JSON gia' pronto
```

Supporta:

```text
PDF
DOCX
PNG / JPG / JPEG / WEBP
TXT
JSON
```

Variabili ambiente necessarie:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Le chiavi AI non devono mai iniziare con `NEXT_PUBLIC_`.

## Aggiornamento

Copia questa versione sopra la cartella attuale senza cancellare:

```text
node_modules
.env.local
package-lock.json
.git
```

Poi:

```powershell
npm run dev
```

Se tutto funziona:

```powershell
npm run build
git add .
git commit -m "v0.24.0 vocabolario ExerciseDB controllato"
git push
```

## Database

Nessuna nuova migration Supabase.

## Dipendenze

Nessuna nuova dipendenza rispetto alla v0.23.


## v0.24.0 - Fix parsing JSON AI

- Aggiunta utility `lib/ai/extractJson.ts` per estrarre il primo oggetto JSON completo anche quando Gemini aggiunge testo extra dopo il JSON.
- Aggiornati `lib/ai/parseAiJson.ts` e `lib/ai/providers/gemini.ts` per usare lo stesso parser robusto sia nella conversione scheda sia nella selezione candidati ExerciseDB.
- Risolve errori del tipo `Unexpected non-whitespace character after JSON`.


## v0.24.0 - Media review ExerciseDB

- Aggiunta correzione manuale GIF/media ExerciseDB dalle card esercizio.
- Nuova ricerca server-side nel catalogo ExerciseDB locale.
- Possibilita di scegliere una GIF alternativa reale dal catalogo.
- Possibilita di rimuovere una GIF sbagliata e lasciare l'esercizio senza media.
- Il backend valida sempre exercise_db_id e copia media_url dal gifUrl ufficiale del catalogo.
- Nessuna nuova migration Supabase e nessuna nuova dipendenza.

## v0.25.1 - Ricerca ExerciseDB migliorata

- Migliorata la ricerca manuale nella funzione `Cambia GIF` / `Cerca GIF`.
- Aggiunta espansione query con sinonimi italiani e abbreviazioni da palestra.
- Query come `pec fly`, `pec deck`, `lat machine`, `push down`, `sitted calf machine`, `croci cavi`, `leg curl` producono risultati più pertinenti.
- Ranking migliorato su nome esercizio, target muscle, body part, attrezzatura, movement pattern e alias.
- Nessuna nuova migration Supabase e nessuna nuova dipendenza.


## v0.25.1

- Spostato il Giorno consigliato nella Home subito dopo il saluto.
- Corretto errore TypeScript nella ricerca ExerciseDB: chiave `"in piedi"`.


## v0.25.1 - Editor scheda base

- Aggiunta pagina `/workout/edit` per modificare la scheda attiva.
- Modifica nome scheda, mese, date, nome/descrizione giorni.
- Modifica esercizi: nome, serie, reps, recupero, gruppo, RPE, peso suggerito, note tecniche e trainer notes.
- Riordino giorni ed esercizi con frecce su/giù.
- Aggiunta di nuovi giorni e nuovi esercizi.
- Nessuna eliminazione distruttiva: delete/cestino arriveranno con soft delete per non rompere lo storico.
- Nessuna nuova migration Supabase.


## v0.26.0 - Analytics palestra

- Progressi aggiornati con analytics più utili per la palestra.
- La costanza ora usa i giorni svolti da lunedì, non la streak di giorni consecutivi.
- Aggiunta durata media degli allenamenti, calcolata escludendo il tempo in pausa quando disponibile.
- Aggiunta frequenza muscolare settimanale.
- Aggiunti esercizi da monitorare quando il carico resta stabile nelle ultime sessioni.
- Il giorno consigliato mostra una durata stimata.
- Durante l’allenamento viene mostrata una stima di fine sessione basata sullo storico o, se mancano dati, su serie/recuperi della scheda.

Nessuna nuova migration Supabase rispetto alla v0.25.3.

# Gym Tracker App v0.23.5

PWA mobile-first per gestire schede palestra personali con profili, import scheda, allenamento guidato, storico, progressi, timer e backup.

## Novita v0.23.5

Questa versione rende l'import AI piu' controllato e piu' veloce da leggere per Gemini.

La pipeline ora e':

```text
Gemini legge la scheda
Gemini produce query + intento dell'esercizio
Backend cerca nel catalogo completo locale ExerciseDB
Backend crea una mini-lista short di 5-8 candidati reali
Gemini sceglie solo tra quei candidati short
Backend copia exercise_db_id e gifUrl dal catalogo completo
```

## Catalogo ExerciseDB

Sono inclusi tre file dati:

```text
data/exercisedb-catalog.json
```

Catalogo completo usato dal backend come fonte ufficiale per ID e GIF.

```text
data/exercisedb-catalog-short.json
```

Versione compatta del catalogo. Non contiene URL e usa campi brevi:

```text
id = exercise_db_id
n = nome esercizio
eq = attrezzatura
bp = body part
tm = target muscle
sec = muscoli secondari
pat = movement pattern
aka = alias inglesi/italiani
```

```text
data/exercisedb-index-compact.csv
```

CSV sorgente di riferimento.

## Matching AI prudente

Gemini non riceve tutto il CSV da 1500 righe.

Il backend filtra il catalogo e passa a Gemini solo pochi candidati reali in formato short. Questo riduce confusione, costo e rischio di GIF sbagliate.

La GIF viene applicata solo se Gemini sceglie un candidato con confidenza alta.

Se la confidenza e' media o bassa:

```text
exercise_db_id = ""
media_url = ""
```

Meglio nessuna GIF che una GIF sbagliata.

## Prompt migliorato

Il prompt chiede a Gemini di interpretare l'esercizio per caratteristiche, non solo per traduzione letterale:

- movimento principale;
- attrezzatura;
- distretto;
- muscolo target;
- posizione;
- presa;
- inclinazione panca;
- lato/arto.

Esempi gestiti meglio:

```text
Stacchi regular -> barbell deadlift
Lat pull down machine -> machine/lever lat pulldown
Tirate su panca a 30 gradi supino -> reverse grip incline bench row / chest supported incline row
Sitted calf machine -> seated calf raise machine
Leg curl -> leg curl machine
```

`trainer_notes` resta dedicato solo a consigli pratici di esecuzione.

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
git commit -m "v0.23.5 CSV completo ExerciseDB AI"
git push
```

## Database

Nessuna nuova migration Supabase.

## Dipendenze

Nessuna nuova dipendenza rispetto alla v0.23.


## v0.23.5 — CSV completo ExerciseDB per Gemini

Questa versione semplifica il flusso AI Import: Gemini riceve la scheda e il CSV ExerciseDB completo, senza catalogo short e senza selezione tra candidati filtrati.

Regole di sicurezza mantenute:

- `exercise_db_id` viene accettato solo se esiste nel catalogo locale.
- `media_url` viene sempre sovrascritto dal backend usando il `gifUrl` ufficiale della stessa riga ExerciseDB.
- Se Gemini non trova una corrispondenza sicura nel CSV, l'esercizio resta senza GIF.
- Supabase salva solo dopo preview e conferma utente.

# Gym Tracker App v0.23.1

PWA mobile-first per gestire schede palestra personali con profili, PIN, import scheda, allenamento guidato, timer, storico, calendario, progressi, backup e import AI.

## Novita v0.23.1

Questa versione migliora la v0.23 e usa davvero il catalogo ExerciseDB da 1500 esercizi per ridurre GIF sbagliate e match inventati.

- Integrato catalogo ExerciseDB strutturato:

```txt
data/exercisedb-catalog.json
```

- Incluso anche il CSV sorgente:

```txt
data/exercisedb-index-compact.csv
```

- Matching locale piu intelligente su:
  - nome esercizio;
  - aliases inglesi;
  - aliases italiani;
  - attrezzatura;
  - body part;
  - muscolo target;
  - pattern di movimento;
  - search_text.
- Il modello AI non sceglie direttamente `exercise_db_id` o `media_url`.
- `exercise_db_id` e `media_url` vengono copiati solo dal catalogo ExerciseDB.
- Se il match e' alto, la GIF viene applicata automaticamente.
- Se il match e' medio, viene mostrato come possibile candidato da controllare e la GIF non viene applicata automaticamente.
- Se il match e' basso, l'esercizio resta senza GIF.
- `trainer_notes` ora e' dedicato ai consigli pratici di esecuzione, non ai dubbi di matching.
- Il prompt passa esplicitamente il mese corrente al modello.
- Preview Import aggiornata con conteggio esercizi da controllare e dimensione catalogo.

## Funzione AI Import

La pagina Import supporta:

- PDF
- DOCX
- PNG/JPG/JPEG/WEBP
- TXT
- JSON

Endpoint server-side:

```txt
app/api/ai/convert-workout-plan/route.ts
```

Flusso:

```txt
file trainer -> AI server-side -> JSON normalizzato -> matching ExerciseDB locale -> preview -> conferma utente -> /api/import-workout-plan
```

L'import finale continua a passare da:

```txt
/api/import-workout-plan
```

## Variabili ambiente

In locale crea o aggiorna `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Su Vercel aggiungi le stesse variabili in Project Settings -> Environment Variables.

Importante: le chiavi AI non devono mai iniziare con `NEXT_PUBLIC_`.

## Aggiornamento da v0.23

Copia i file sopra la cartella attuale senza cancellare:

```txt
node_modules
.env.local
package-lock.json
.git
```

La dipendenza `mammoth` era gia' stata aggiunta in v0.23. Se hai gia' fatto `npm install` con la v0.23, non servono nuove dipendenze.

Poi esegui:

```powershell
npm run dev
```

Poi, se tutto funziona:

```powershell
npm run build
git add .
git commit -m "v0.23.1 ExerciseDB smart matching"
git push
```

## Database

Nessuna nuova migration Supabase.

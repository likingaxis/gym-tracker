# Gym Tracker App v0.26.4

PWA mobile-first per schede palestra personali, allenamenti guidati, storico, analytics, import AI, editor e gestione multi-scheda.

## Focus v0.26.4

Questa versione applica un pass completo di **chiarezza UX, affordance e basso carico cognitivo** alla direzione “Officina di precisione”.

Principali interventi:

- Home ridotta alle decisioni essenziali, con giorno consigliato chiaramente identificato;
- Scheda consultabile senza avviare una sessione;
- azione “Inizia” separata dall’apertura del dettaglio giorno;
- Import organizzato in tre step reali: File, Revisione, Attiva;
- Progressi trasformati in rapporto tecnico con insight e colori semantici;
- allenamento con un solo esercizio operativo in primo piano;
- righe esercizio espandibili tramite tap e chevron, senza pulsanti “Apri” ridondanti;
- GIF apribile a schermo intero;
- media ExerciseDB spostati tra le azioni secondarie;
- mini-player distinto dal canvas, con Pausa/Riprendi e Apri sempre visibili;
- editor scheda organizzato per Programma, Giorno ed Esercizio;
- selettore giorno a menu e azione Aggiungi contestuale;
- pannello esercizio in bottom sheet;
- tipografia operativa più grande e leggibile;
- microcopy ridotta e più orientata allo stato corrente;
- focus, touch target e signifier più espliciti;
- profili senza bottom navigation.

La versione non modifica il database e non aggiunge dipendenze.

## Migrazioni

Non ci sono nuove migration. Restano necessarie:

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
npm run build
```

Se tutto funziona:

```powershell
git add .
git commit -m "v0.26.4 UX clarity and affordance"
git push
```

## Variabili ambiente AI

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Le chiavi AI devono restare esclusivamente server-side e non devono iniziare con `NEXT_PUBLIC_`.

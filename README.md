# Gym Tracker App v0.26.6

PWA mobile-first per schede palestra personali, allenamenti guidati, storico, analytics, import AI, editor e gestione multi-scheda.

## Focus v0.26.6

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
git commit -m "v0.26.6 fix widget player dialogs"
git push
```

## Variabili ambiente AI

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Le chiavi AI devono restare esclusivamente server-side e non devono iniziare con `NEXT_PUBLIC_`.


## v0.26.5
- Ripristinato il widget flottante di avanzamento durante l’allenamento.
- Mini-player semplificato con icone pausa/riprendi e cestino.
- Sostituiti gli alert JavaScript con dialoghi centrali coerenti.
- Migliorata la gerarchia visiva di Profili, Statistiche e Impostazioni.


## v0.26.6
- Ripristinato il widget progresso con posizione e comportamento della versione originale.
- Rimossa l’etichetta flottante che interferiva con le card durante lo scroll.
- Corretto il pannello Andamento e rimosso un blocco di proprietà duplicato.
- Mini-player ricostruito con contrasto elevato, testo leggibile e sole icone per pausa/riprendi e cestino.
- Dialoghi renderizzati tramite portal direttamente nel body, sempre centrati nel viewport.
- Blocco dello scroll, chiusura con Escape e focus automatico sull’azione principale.
- Corretto un selettore CSS duplicato nella sezione profili.

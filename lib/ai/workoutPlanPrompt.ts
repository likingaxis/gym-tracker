function currentMonthRome() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function buildWorkoutPlanPrompt(inputKind: "text" | "file") {
  const sourceHint = inputKind === "text" ? "Il contenuto della scheda e' fornito come testo." : "Il contenuto della scheda e' nel file allegato.";
  const month = currentMonthRome();

  return `${sourceHint}
Data corrente da usare se mancano mese o date: ${month}.

Trasforma la scheda palestra in JSON valido per una web app palestra.
Rispondi SOLO con JSON valido, senza markdown, senza blocchi di codice e senza testo prima o dopo.

Schema obbligatorio:
{
  "name": "Scheda Nome Mese Anno",
  "month": "YYYY-MM",
  "start_date": "",
  "end_date": "",
  "days": [
    {
      "name": "Giorno 1 - Nome allenamento",
      "order": 1,
      "description": "Indicazioni generali del giorno o stringa vuota",
      "exercises": [
        {
          "order": 1,
          "name": "Nome esercizio pulito in italiano",
          "exercise_db_query": "english exercise search query",
          "alternative_queries": ["english alternative query"],
          "equipment_hint": "english equipment hint",
          "target_muscle_hint": "english target muscle hint",
          "body_part_hint": "english body part hint",
          "movement_pattern": "english movement pattern",
          "exercise_db_id": "",
          "muscle_group": "Gruppo muscolare",
          "sets": 3,
          "reps": "15",
          "rest_seconds": 90,
          "target_rpe": "",
          "suggested_weight": "",
          "technique_notes": "",
          "tips": "",
          "video_url": "",
          "media_url": "",
          "trainer_notes": "Consigli pratici e brevi su esecuzione, setup, controllo movimento, errori da evitare e focus muscolare."
        }
      ]
    }
  ]
}

Regole:
- Mantieni ordine e significato della scheda originale.
- Se non ci sono mese/date, usa ${month} come month e stringhe vuote per start_date/end_date.
- sets deve essere sempre numerico e maggiore di zero.
- reps deve essere sempre stringa, anche se e' un numero, un range o "max".
- rest_seconds deve essere numerico. Se non indicato usa 90.
- Non usare null. Usa stringhe vuote quando non sai un valore testuale.
- Non inventare exercise_db_id e non inventare media_url: lasciali sempre vuoti.
- Non usare link markdown.
- Non aggiungere campi extra oltre a quelli dello schema e ai campi di supporto ExerciseDB indicati.
- trainer_notes deve contenere solo consigli pratici per eseguire meglio l'esercizio.
- Non usare trainer_notes per proporre versioni alternative o per parlare del match ExerciseDB.
- Se una voce e' ambigua, mantieni il nome originale e rendi exercise_db_query prudente; l'ambiguita' verra' gestita dal backend.
- Per ogni esercizio genera exercise_db_query in inglese e, se utile, alternative_queries/equipment_hint/target_muscle_hint/body_part_hint/movement_pattern per aiutare il backend a cercare nel catalogo ExerciseDB.
- Le query ExerciseDB devono descrivere l'esercizio piu' probabile, non una variante diversa.
- Se trovi note su tecnica, carichi, cedimento, RPE o progressione, mettile in technique_notes, tips, target_rpe, suggested_weight o trainer_notes.
`;
}

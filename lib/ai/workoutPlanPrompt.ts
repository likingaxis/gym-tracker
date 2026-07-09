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
          "position_hint": "standing | seated | lying | kneeling | chest supported | hanging | empty string",
          "grip_hint": "overhand | underhand | supinated | pronated | neutral | wide | close | empty string",
          "bench_angle_hint": "flat | incline | decline | empty string",
          "side_hint": "one arm | two arms | single leg | both legs | empty string",
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
- Usa il catalogo CSV ExerciseDB allegato al prompt per scegliere exercise_db_id e media_url quando trovi una corrispondenza sicura. Non inventare mai exercise_db_id o media_url: se non sono presenti nel CSV, lasciali vuoti.
- Non usare link markdown.
- Non aggiungere campi extra oltre a quelli dello schema e ai campi di supporto ExerciseDB indicati.
- trainer_notes deve contenere solo consigli pratici per eseguire meglio l'esercizio.
- Non usare trainer_notes per proporre versioni alternative o per parlare del match ExerciseDB.
- Se una voce e' ambigua, mantieni il nome originale, rendi exercise_db_query prudente e lascia exercise_db_id/media_url vuoti se il catalogo non contiene una corrispondenza chiara.

Uso del catalogo ExerciseDB:
- Nel messaggio riceverai anche un CSV ufficiale ExerciseDB completo.
- Puoi usare quel CSV per compilare exercise_db_id e media_url.
- media_url deve essere copiato esattamente dalla colonna gifUrl della stessa riga scelta.
- Non costruire URL manualmente.
- Non scegliere esercizi diversi solo perche' hanno muscoli simili.
- Se sei indeciso tra varianti diverse, lascia ID e URL vuoti.

Interpretazione ExerciseDB:
- Non tradurre letteralmente il nome italiano: interpreta prima l'intento biomeccanico.
- Per ogni esercizio identifica: movimento principale, attrezzatura, distretto, muscolo target, posizione, presa, inclinazione panca e lato quando presenti.
- movement_pattern deve essere uno tra: press, fly, row, pulldown, pullup, curl, extension, squat, lunge, deadlift, hinge, leg press, leg curl, leg extension, calf raise, crunch, plank, rotation, carry, stretch, hold, dip, pushup, unknown.
- Esempi di ragionamento, non valori obbligatori:
  - "Stacchi regular" => barbell deadlift, movement_pattern deadlift, equipment barbell, target glutes/hamstrings/lower back.
  - "Lat pull down machine" => machine lat pulldown o lever lat pulldown, movement_pattern pulldown, equipment machine/leverage machine, target lats.
  - "Tirate su panca a 30 gradi supino" => incline bench row / reverse grip incline bench row / chest supported incline row, movement_pattern row, position chest supported, bench_angle incline, grip supinated/underhand.
  - "Sitted calf machine" => seated calf raise machine, movement_pattern calf raise, position seated, target calves.
  - "Leg curl" => leg curl machine, movement_pattern leg curl, target hamstrings.
- Per ogni esercizio genera exercise_db_query in inglese e alternative_queries utili. Gemini deve usare direttamente il CSV ExerciseDB completo allegato al prompt. Il backend validara' comunque ID e GIF contro il catalogo locale prima di importare.
- Le query ExerciseDB devono descrivere l'esercizio piu' probabile, non una variante diversa.
- Se trovi note su tecnica, carichi, cedimento, RPE o progressione, mettile in technique_notes, tips, target_rpe, suggested_weight o trainer_notes.
`;
}

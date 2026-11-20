import { getPromptVocabularyForLlm } from "@/lib/ai/exerciseDbVocabulary";

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
  const vocabulary = getPromptVocabularyForLlm();

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
          "exercise_db_query": "english exercise search query built with controlled ExerciseDB words",
          "alternative_queries": ["english alternative query using controlled words"],
          "equipment_hint": "controlled equipment term or empty string",
          "target_muscle_hint": "controlled target muscle term or empty string",
          "body_part_hint": "controlled body part term or empty string",
          "movement_pattern": "controlled movement pattern or unknown",
          "variant_hints": ["controlled variant words such as incline, bench, seated, rope, wide grip"],
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
          "trainer_notes": "Consigli pratici e brevi su esecuzione, setup, controllo movimento, errori da evitare e focus muscolare.",
          "group_type": "",
          "group_id": "",
          "group_order": null
        }
      ]
    }
  ]
}

Regole generali:
- Mantieni ordine e significato della scheda originale.
- Se non ci sono mese/date, usa ${month} come month e stringhe vuote per start_date/end_date.
- sets deve essere sempre numerico e maggiore di zero.
- reps deve essere sempre stringa, anche se e' un numero, un range o "max".
- rest_seconds deve essere numerico (0 e' valido per i passaggi senza pausa nelle superserie). Se non indicato per un esercizio singolo usa 90.
- Non usare null per campi testuali. Usa stringhe vuote quando non sai un valore testuale.
- Non usare link markdown.
- Non aggiungere campi extra oltre a quelli dello schema e ai campi di supporto ExerciseDB indicati.
- trainer_notes deve contenere solo consigli pratici per eseguire meglio l'esercizio.
- Non usare trainer_notes per proporre versioni alternative o per parlare del match ExerciseDB.

Regole Superserie, Jumpset, Triset e Circuiti:
- Se la scheda contiene una Superserie (es. "Superserie", "SUPER SERIE", "SS", "A1 / A2", "Esercizio 1 + Esercizio 2 senza pausa"):
  - Crea oggetti esercizio separati e consecutivi in exercises, ciascuno con "group_type": "superset", "group_id": "A" (usa "A", "B", "C" per gruppi diversi nello stesso giorno) e "group_order": 1, 2, ecc.
  - Imposta "rest_seconds": 0 sul primo esercizio (o primi esercizi) della superserie e metti il recupero di fine giro sull'ultimo esercizio del gruppo.
  - Esempio: "SUPER SERIE 3 x 10 croci ai cavi alti + alzate laterali con manubri rec 1 min" => esercizio 1 ("Croci ai cavi alti", sets: 3, reps: "10", rest_seconds: 0, group_type: "superset", group_id: "A", group_order: 1) ed esercizio 2 ("Alzate laterali con manubri", sets: 3, reps: "10", rest_seconds: 60, group_type: "superset", group_id: "A", group_order: 2).
  - Esempio: "super serie spider curl panca 45° + french press manubri panca 30° 3 x 10 (entrambi) rec 1 min" => entrambi sets: 3, reps: "10", rest_seconds: 0 sul primo e 60 sul secondo, stesso group_id ("A" o "B").
- Se la scheda contiene un Jumpset / Jumper set (es. "Jumpset", "JUMPER SET", "Jumper set", "JS", "Jump set", "Serie alternate A1 / A2 con recupero"):
  - Crea oggetti esercizio separati e consecutivi in exercises, ciascuno con "group_type": "jumpset", "group_id": "A" (poi "B", "C"...) e "group_order": 1, 2.
  - Imposta "rest_seconds" di ciascun esercizio al recupero prescritto dopo ogni serie (es. 30, 60 o 80).
  - Esempio: "JUMPER SET 3 x 8 alzate frontali con manubri rec 30 sec + 3 x 10 alzate posteriori da seduto rec 1:20" => esercizio 1 ("Alzate frontali con manubri", sets: 3, reps: "8", rest_seconds: 30, group_type: "jumpset", group_id: "B", group_order: 1) ed esercizio 2 ("Alzate posteriori da seduto", sets: 3, reps: "10", rest_seconds: 80, group_type: "jumpset", group_id: "B", group_order: 2).
- Per 3 o piu' esercizi consecutivi senza recupero usa "group_type": "triset" (oppure "circuit" se e' un circuito).
- Per gli esercizi singoli normali lascia "group_type": "", "group_id": "", "group_order": null.

Regole ExerciseDB:
- In questa prima chiamata NON compilare exercise_db_id e NON compilare media_url: lasciali sempre vuoti.
- Il backend cerchera' candidati reali nel catalogo ExerciseDB usando i campi normalizzati che produci.
- Tu devi solo interpretare la scheda e generare query/hint usando il vocabolario controllato sotto.
- Non tradurre letteralmente il nome italiano: interpreta prima l'intento biomeccanico.
- Per ogni esercizio identifica: movimento principale, attrezzatura, distretto, muscolo target, posizione, presa, inclinazione panca e lato quando presenti.
- Usa parole molto simili o identiche a quelle del vocabolario controllato per: exercise_db_query, alternative_queries, equipment_hint, body_part_hint, target_muscle_hint, movement_pattern, variant_hints.
- Se una voce e' ambigua, mantieni il nome originale, rendi exercise_db_query prudente e lascia ID/URL vuoti.

Esempi di normalizzazione:
- "Stacchi regular" => exercise_db_query "barbell deadlift", movement_pattern "deadlift", equipment_hint "barbell", target_muscle_hint "glutes" o "hamstrings", variant_hints ["regular", "barbell"].
- "Lat pull down machine" => exercise_db_query "lever lat pulldown" oppure "lat pulldown", movement_pattern "pulldown", equipment_hint "leverage machine", target_muscle_hint "lats".
- "Tirate su panca a 30 gradi supino" => exercise_db_query "reverse grip incline bench row" oppure "incline bench row", movement_pattern "row", position_hint "chest supported", bench_angle_hint "incline", grip_hint "supinated".
- "Sitted calf machine" => correggi mentalmente in "seated calf machine", exercise_db_query "lever seated calf raise", movement_pattern "calf raise", equipment_hint "leverage machine", target_muscle_hint "calves", position_hint "seated".
- "Leg curl" => exercise_db_query "lever lying leg curl" oppure "leg curl", movement_pattern "leg curl", target_muscle_hint "hamstrings".
- "Dead hang" non deve diventare hanging leg raise: e' un hold/hang, non un raise addominale.

Vocabolario controllato ExerciseDB da usare per normalizzare:
${vocabulary}`;
}

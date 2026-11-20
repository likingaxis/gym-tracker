export type ExerciseGroupType = "superset" | "jumpset" | "triset" | "circuit";

export type GroupableExercise = {
  id: string;
  name: string;
  sets?: number | null;
  rest_seconds?: number | null;
  group_type?: string | null;
  group_id?: string | null;
  group_order?: number | null;
  technique_notes?: string | null;
  trainer_notes?: string | null;
  tips?: string | null;
  exercise_db_raw?: unknown;
};

export type RawGroupFields = {
  group_type: ExerciseGroupType | null;
  group_id: string | null;
  group_order: number | null;
  explicit: boolean;
};

export type ExerciseGroupMeta = {
  groupType: ExerciseGroupType;
  groupId: string;
  groupOrder: number;
  codeLabel: string;
  badgeLabel: string;
  groupTitle: string;
  memberIds: string[];
  roundRestSeconds: number;
};

export type SetDraftLike = {
  set_number: number;
  completed: boolean;
};

export type ExerciseDraftLike = {
  sets: SetDraftLike[];
  completed?: boolean;
};

const GROUP_TYPE_TITLES: Record<ExerciseGroupType, string> = {
  superset: "Superset",
  jumpset: "Jumpset",
  triset: "Triset",
  circuit: "Circuito",
};

export function getGroupTypeTitle(groupType: ExerciseGroupType): string {
  return GROUP_TYPE_TITLES[groupType];
}

export function normalizeGroupType(value: unknown): ExerciseGroupType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized === "superset" ||
    normalized === "superserie" ||
    normalized === "super set" ||
    normalized === "ss"
  ) {
    return "superset";
  }
  if (
    normalized === "jumpset" ||
    normalized === "jump set" ||
    normalized === "jump-set" ||
    normalized === "jumper set" ||
    normalized === "jumperset" ||
    normalized === "jumper-set" ||
    normalized === "js"
  ) {
    return "jumpset";
  }
  if (
    normalized === "triset" ||
    normalized === "tri-set" ||
    normalized === "tri set" ||
    normalized === "giant set" ||
    normalized === "giantset"
  ) {
    return "triset";
  }
  if (normalized === "circuit" || normalized === "circuito") {
    return "circuit";
  }

  return null;
}

export function normalizeGroupId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned || null;
}

function normalizePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.trunc(parsed);
  return rounded > 0 ? rounded : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inferGroupTypeFromText(text: string): ExerciseGroupType | null {
  const lower = text.toLowerCase();
  if (/\bjumpset\b|\bjumper[\s-]?set\b|\bjump[\s-]?set\b|\b\[js\b|\bjs\s+[a-z]\d*/i.test(lower)) {
    return "jumpset";
  }
  if (/\btriset\b|\btri[\s-]?set\b|\bgiant[\s-]?set\b|\bserie gigante\b/i.test(lower)) {
    return "triset";
  }
  if (/\bcircuito\b|\bcircuit\b/i.test(lower)) {
    return "circuit";
  }
  if (/\bsuperserie\b|\bsuperset\b|\bsuper[\s-]?set\b|\b\[ss\b|\bss\s+[a-z]\d*/i.test(lower)) {
    return "superset";
  }
  return null;
}

export function getRawGroupFields(exercise: Partial<GroupableExercise>): RawGroupFields {
  const directType = normalizeGroupType(exercise.group_type);
  const directId = normalizeGroupId(exercise.group_id);
  const directOrder = normalizePositiveInt(exercise.group_order);

  if (directType || directId) {
    return {
      group_type: directType ?? "superset",
      group_id: directId ?? "A",
      group_order: directOrder,
      explicit: true,
    };
  }

  const raw = exercise.exercise_db_raw;
  if (isRecord(raw) && isRecord(raw.group)) {
    const rawType = normalizeGroupType(raw.group.group_type);
    const rawId = normalizeGroupId(raw.group.group_id);
    const rawOrder = normalizePositiveInt(raw.group.group_order);
    if (rawType || rawId) {
      return {
        group_type: rawType ?? "superset",
        group_id: rawId ?? "A",
        group_order: rawOrder,
        explicit: true,
      };
    }
  }

  const combinedText = [
    exercise.name ?? "",
    exercise.technique_notes ?? "",
    exercise.trainer_notes ?? "",
    exercise.tips ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const tagMatch = combinedText.match(
    /\[(SUPERSET|SUPERSERIE|JUMPSET|JUMPER\s*SET|JUMP\s*SET|TRISET|CIRCUIT|CIRCUITO|SS|JS)\s+([A-Z])(\d+)?\]/i,
  );
  if (tagMatch) {
    return {
      group_type: normalizeGroupType(tagMatch[1]) ?? "superset",
      group_id: tagMatch[2].toUpperCase(),
      group_order: tagMatch[3] ? Number(tagMatch[3]) : null,
      explicit: true,
    };
  }

  const namePrefixMatch = (exercise.name ?? "")
    .trim()
    .match(/^([A-F])([1-9])\s*(?:[-–—:.)]|\s)\s*\S+/i);
  if (namePrefixMatch) {
    return {
      group_type: inferGroupTypeFromText(combinedText) ?? "superset",
      group_id: namePrefixMatch[1].toUpperCase(),
      group_order: Number(namePrefixMatch[2]),
      explicit: false,
    };
  }

  return {
    group_type: null,
    group_id: null,
    group_order: null,
    explicit: false,
  };
}

export function resolveExerciseGroups<T extends GroupableExercise>(
  exercises: T[],
): Map<string, ExerciseGroupMeta> {
  const result = new Map<string, ExerciseGroupMeta>();
  if (!exercises.length) return result;

  type Candidate = {
    exercise: T;
    index: number;
    raw: RawGroupFields;
  };

  const byGroupId = new Map<string, Candidate[]>();
  const claimedIndices = new Set<number>();

  exercises.forEach((exercise, index) => {
    const raw = getRawGroupFields(exercise);
    if (!raw.group_id || !raw.group_type) return;
    const list = byGroupId.get(raw.group_id) ?? [];
    list.push({ exercise, index, raw });
    byGroupId.set(raw.group_id, list);
    claimedIndices.add(index);
  });

  // Note-based consecutive pairing fallback (e.g. "Superserie con...", "Jumper set con...")
  let letterIdx = 0;
  const nextAvailableGroupId = () => {
    while (letterIdx < 26) {
      const candidate = String.fromCharCode(65 + letterIdx);
      letterIdx += 1;
      if (!byGroupId.has(candidate)) return candidate;
    }
    return `G${letterIdx++}`;
  };

  const partnerMatchesName = (noteText: string, partnerName: string) => {
    const partnerMatch = noteText.match(/\bcon\s+([a-z0-9àèéìòù\s'-]+)/i);
    if (!partnerMatch) return false;
    const stopWords = new Set(["con", "per", "nel", "nella", "alle", "agli", "cavi", "manubri"]);
    const noteTokens = partnerMatch[1]
      .toLowerCase()
      .split(/[^a-z0-9àèéìòù]+/)
      .filter((t) => t.length >= 3 && !stopWords.has(t));
    const targetLower = partnerName.toLowerCase();
    return noteTokens.some((token) => targetLower.includes(token));
  };

  for (let i = 0; i < exercises.length - 1; i += 1) {
    if (claimedIndices.has(i) || claimedIndices.has(i + 1)) continue;

    const exCurrent = exercises[i];
    const exNext = exercises[i + 1];
    const textCurrent = [
      exCurrent.name ?? "",
      exCurrent.technique_notes ?? "",
      exCurrent.trainer_notes ?? "",
      exCurrent.tips ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    const textNext = [
      exNext.name ?? "",
      exNext.technique_notes ?? "",
      exNext.trainer_notes ?? "",
      exNext.tips ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    const typeCurrent = inferGroupTypeFromText(textCurrent);
    if (!typeCurrent) continue;

    const typeNext = inferGroupTypeFromText(textNext);
    const sameType = typeNext === typeCurrent;
    const explicitPartner = partnerMatchesName(textCurrent, exNext.name ?? "");

    if (sameType || explicitPartner) {
      const groupId = nextAvailableGroupId();
      byGroupId.set(groupId, [
        {
          exercise: exCurrent,
          index: i,
          raw: {
            group_type: typeCurrent,
            group_id: groupId,
            group_order: 1,
            explicit: false,
          },
        },
        {
          exercise: exNext,
          index: i + 1,
          raw: {
            group_type: typeCurrent,
            group_id: groupId,
            group_order: 2,
            explicit: false,
          },
        },
      ]);
      claimedIndices.add(i);
      claimedIndices.add(i + 1);
      i += 1;
    }
  }

  for (const [groupId, items] of byGroupId.entries()) {
    const hasExplicit = items.some((item) => item.raw.explicit);
    if (items.length < 2 && !hasExplicit) {
      continue;
    }

    const sorted = [...items].sort((a, b) => {
      const orderA = a.raw.group_order ?? a.index + 1;
      const orderB = b.raw.group_order ?? b.index + 1;
      if (orderA !== orderB) return orderA - orderB;
      return a.index - b.index;
    });

    // Prefer non-default explicit type (e.g. jumpset if any member is jumpset)
    const explicitTypes = sorted
      .map((item) => item.raw.group_type)
      .filter((type): type is ExerciseGroupType => type !== null);
    let resolvedType: ExerciseGroupType =
      explicitTypes.find((t) => t === "jumpset") ??
      explicitTypes.find((t) => t === "circuit") ??
      explicitTypes.find((t) => t === "triset") ??
      explicitTypes[0] ??
      "superset";

    if (resolvedType === "superset" && sorted.length >= 3 && !items.some((i) => i.raw.group_type === "superset" && i.raw.explicit)) {
      resolvedType = "triset";
    }

    const lastMember = sorted[sorted.length - 1]?.exercise;
    const positiveRests = sorted
      .map((item) => item.exercise.rest_seconds)
      .filter((r): r is number => typeof r === "number" && Number.isFinite(r) && r > 0);

    let roundRestSeconds = 90;
    if (typeof lastMember?.rest_seconds === "number" && Number.isFinite(lastMember.rest_seconds)) {
      if (lastMember.rest_seconds > 0) {
        roundRestSeconds = lastMember.rest_seconds;
      } else if (positiveRests.length > 0) {
        roundRestSeconds = Math.max(...positiveRests);
      } else {
        roundRestSeconds = 0;
      }
    } else if (positiveRests.length > 0) {
      roundRestSeconds = Math.max(...positiveRests);
    }

    const memberIds = sorted.map((item) => item.exercise.id);
    const titlePrefix = getGroupTypeTitle(resolvedType);
    const groupTitle = `${titlePrefix} ${groupId}`;

    sorted.forEach((item, memberIdx) => {
      const groupOrder = item.raw.group_order ?? memberIdx + 1;
      const codeLabel = `${groupId}${groupOrder}`;
      result.set(item.exercise.id, {
        groupType: resolvedType,
        groupId,
        groupOrder,
        codeLabel,
        badgeLabel: `${titlePrefix} ${codeLabel}`,
        groupTitle,
        memberIds,
        roundRestSeconds,
      });
    });
  }

  return result;
}

export function getGroupSummaryTitles<T extends GroupableExercise>(exercises: T[]): string[] {
  const groups = resolveExerciseGroups(exercises);
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const meta of groups.values()) {
    if (meta.memberIds.length < 2) continue;
    const label = getGroupTypeTitle(meta.groupType);
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }

  return labels;
}

export function getSetCompletionPlan<T extends GroupableExercise>({
  exercises,
  drafts,
  groups,
  currentExercise,
  completedSetNumber,
}: {
  exercises: T[];
  drafts: Record<string, ExerciseDraftLike | undefined>;
  groups: Map<string, ExerciseGroupMeta>;
  currentExercise: T;
  completedSetNumber: number;
}): {
  shouldStartTimer: boolean;
  restSeconds: number;
  nextExerciseIndex: number | null;
  nextStepLabel: string | null;
} {
  const isSetDone = (exerciseId: string, setNumber: number) => {
    if (exerciseId === currentExercise.id && setNumber === completedSetNumber) {
      return true;
    }
    const draft = drafts[exerciseId];
    if (!draft) return false;
    return Boolean(draft.sets.find((s) => s.set_number === setNumber)?.completed);
  };

  const isExerciseDone = (ex: T) => {
    const draft = drafts[ex.id];
    if (!draft || draft.sets.length === 0) return false;
    return draft.sets.every((s) => isSetDone(ex.id, s.set_number));
  };

  const getPlannedSetCount = (ex: T) =>
    Math.max(1, drafts[ex.id]?.sets.length ?? Number(ex.sets ?? 1));

  const formatExerciseRef = (ex: T) => {
    const meta = groups.get(ex.id);
    return meta ? `${meta.codeLabel} · ${ex.name}` : ex.name;
  };

  const findNextIncompleteOutsideGroup = (excludeIds: Set<string>, afterIndex: number): T | null => {
    const after = exercises
      .slice(afterIndex + 1)
      .find((ex) => !excludeIds.has(ex.id) && !isExerciseDone(ex));
    if (after) return after;

    return exercises.find((ex) => !excludeIds.has(ex.id) && !isExerciseDone(ex)) ?? null;
  };

  const currentIndex = exercises.findIndex((ex) => ex.id === currentExercise.id);
  const group = groups.get(currentExercise.id);

  if (group && group.memberIds.length >= 2) {
    const members = group.memberIds
      .map((id) => exercises.find((ex) => ex.id === id))
      .filter((ex): ex is T => Boolean(ex));

    const currentMemberPos = members.findIndex((m) => m.id === currentExercise.id);
    const totalRounds = Math.max(...members.map(getPlannedSetCount));
    const currentRound = completedSetNumber;

    // 1. Check if a subsequent member in the same round still needs this round's set
    const nextInSameRound = members
      .slice(currentMemberPos + 1)
      .find((member) => {
        const memberSets = getPlannedSetCount(member);
        return currentRound <= memberSets && !isSetDone(member.id, currentRound);
      });

    if (nextInSameRound) {
      const nextIdx = exercises.findIndex((ex) => ex.id === nextInSameRound.id);
      const nextLabel = `Poi: ${formatExerciseRef(nextInSameRound)} (Giro ${currentRound}/${totalRounds})`;

      if (group.groupType === "jumpset") {
        const rest = Math.max(0, Number(currentExercise.rest_seconds ?? 60));
        return {
          shouldStartTimer: rest > 0,
          restSeconds: rest,
          nextExerciseIndex: nextIdx >= 0 && nextIdx !== currentIndex ? nextIdx : null,
          nextStepLabel: nextLabel,
        };
      }

      // Superset / Triset / Circuit: no rest within the round unless a short explicit transition rest (1..30s) is set
      const rawRest = currentExercise.rest_seconds;
      const hasShortTransitionRest =
        typeof rawRest === "number" && Number.isFinite(rawRest) && rawRest > 0 && rawRest <= 30;

      return {
        shouldStartTimer: hasShortTransitionRest,
        restSeconds: hasShortTransitionRest ? rawRest : 0,
        nextExerciseIndex: nextIdx >= 0 && nextIdx !== currentIndex ? nextIdx : null,
        nextStepLabel: nextLabel,
      };
    }

    // 2. End of round: find the earliest round with an incomplete set among group members
    let nextRoundTarget: { member: T; round: number } | null = null;
    for (let round = 1; round <= totalRounds; round += 1) {
      const candidate = members.find((member) => {
        const memberSets = getPlannedSetCount(member);
        return round <= memberSets && !isSetDone(member.id, round);
      });
      if (candidate) {
        nextRoundTarget = { member: candidate, round };
        break;
      }
    }

    const roundRest =
      typeof currentExercise.rest_seconds === "number" &&
      Number.isFinite(currentExercise.rest_seconds) &&
      currentExercise.rest_seconds > 0
        ? currentExercise.rest_seconds
        : group.roundRestSeconds;

    if (nextRoundTarget) {
      const nextIdx = exercises.findIndex((ex) => ex.id === nextRoundTarget.member.id);
      return {
        shouldStartTimer: roundRest > 0,
        restSeconds: roundRest,
        nextExerciseIndex: nextIdx >= 0 && nextIdx !== currentIndex ? nextIdx : null,
        nextStepLabel: `Poi: ${formatExerciseRef(nextRoundTarget.member)} (Giro ${nextRoundTarget.round}/${totalRounds})`,
      };
    }

    // 3. Entire group finished: start final rest of the group and advance to next incomplete exercise
    const memberIdSet = new Set(group.memberIds);
    const lastMemberIndex = Math.max(
      ...members.map((m) => exercises.findIndex((ex) => ex.id === m.id)),
    );
    const nextOutside = findNextIncompleteOutsideGroup(memberIdSet, Math.max(currentIndex, lastMemberIndex));
    const nextIdx = nextOutside ? exercises.findIndex((ex) => ex.id === nextOutside.id) : null;

    return {
      shouldStartTimer: roundRest > 0,
      restSeconds: roundRest,
      nextExerciseIndex: nextIdx !== null && nextIdx >= 0 && nextIdx !== currentIndex ? nextIdx : null,
      nextStepLabel: nextOutside ? `Poi: ${formatExerciseRef(nextOutside)} · Serie 1` : "Poi: Fine allenamento",
    };
  }

  // Single (un-grouped) exercise
  const restSeconds = Math.max(0, Number(currentExercise.rest_seconds ?? 60));
  const totalSetsForExercise = getPlannedSetCount(currentExercise);
  const nextIncompleteSetInExercise = Array.from({ length: totalSetsForExercise }, (_, i) => i + 1)
    .find((setNum) => !isSetDone(currentExercise.id, setNum));

  if (nextIncompleteSetInExercise !== undefined) {
    return {
      shouldStartTimer: restSeconds > 0,
      restSeconds,
      nextExerciseIndex: null,
      nextStepLabel: `Poi: ${currentExercise.name} · Serie ${nextIncompleteSetInExercise}/${totalSetsForExercise}`,
    };
  }

  // Last set of single exercise completed -> start timer AND advance to next incomplete exercise
  const nextIncomplete = findNextIncompleteOutsideGroup(new Set([currentExercise.id]), currentIndex);
  const nextIdx = nextIncomplete ? exercises.findIndex((ex) => ex.id === nextIncomplete.id) : null;

  return {
    shouldStartTimer: restSeconds > 0,
    restSeconds,
    nextExerciseIndex: nextIdx !== null && nextIdx >= 0 && nextIdx !== currentIndex ? nextIdx : null,
    nextStepLabel: nextIncomplete ? `Poi: ${formatExerciseRef(nextIncomplete)} · Serie 1` : "Poi: Fine allenamento",
  };
}

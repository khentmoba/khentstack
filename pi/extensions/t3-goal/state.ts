export const ENTRY = "t3-goal:v1";
export type Criterion = { text: string; evidence?: string };
export type Goal = {
  title: string;
  status: "active" | "blocked" | "done";
  criteria: Criterion[];
  note?: string;
};
export type Change = {
  action: string; text?: string; criteria?: string[]; index?: number; evidence?: string;
};

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required.`);
  if (value.length > 4000) throw new Error(`${name} must be at most 4000 characters.`);
  return value.trim();
}

export function changeGoal(current: Goal | null, input: Change): Goal | null {
  if (input.action === "clear") return null;
  if (input.action === "set") {
    const criteria = (input.criteria ?? []).map(text => ({ text: required(text, "Criterion") }));
    if (criteria.length > 30) throw new Error("Use at most 30 criteria.");
    return { title: required(input.text, "Goal"), status: "active", criteria };
  }
  if (!current) throw new Error("Set a goal first.");
  const goal = structuredClone(current);
  switch (input.action) {
    case "add":
      if (goal.criteria.length >= 30) throw new Error("Use at most 30 criteria.");
      goal.criteria.push({ text: required(input.text, "Criterion") });
      goal.status = "active";
      delete goal.note;
      break;
    case "check":
    case "uncheck": {
      const i = input.index;
      if (!Number.isInteger(i) || i! < 1 || i! > goal.criteria.length) throw new Error("Criterion index is out of range (1-based).");
      if (input.action === "check") goal.criteria[i! - 1].evidence = required(input.evidence, "Evidence");
      else delete goal.criteria[i! - 1].evidence;
      if (goal.status === "done") { goal.status = "active"; delete goal.note; }
      break;
    }
    case "block": goal.status = "blocked"; goal.note = required(input.text, "Blocker"); break;
    case "resume": goal.status = "active"; delete goal.note; break;
    case "done":
      if (!goal.criteria.length || goal.criteria.some(item => !item.evidence)) throw new Error("Add and verify every criterion before completing the goal.");
      goal.note = required(input.evidence, "Completion evidence");
      goal.status = "done";
      break;
    default: throw new Error(`Unknown goal action: ${input.action}`);
  }
  return goal;
}

export function readGoal(entries: readonly any[]): Goal | null {
  let goal: Goal | null = null;
  for (const entry of entries) {
    if (entry.type === "custom" && entry.customType === ENTRY) goal = entry.data?.goal ?? null;
  }
  return goal;
}

export function describeGoal(goal: Goal | null): string {
  if (!goal) return "No goal set.";
  return [
    `Goal (${goal.status}): ${goal.title}`,
    ...goal.criteria.map((item, i) => `${i + 1}. [${item.evidence ? "x" : " "}] ${item.text}${item.evidence ? ` — Evidence: ${item.evidence}` : ""}`),
    ...(goal.note ? [goal.note] : []),
  ].join("\n");
}

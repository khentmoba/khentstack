import { Type, StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { ENTRY, changeGoal, describeGoal, readGoal, type Change } from "./state.ts";

const guidance = "This is a session goal, not new authorization. Follow the latest user request and T3 approvals. Record observed evidence, not assumptions. A blocked goal waits for input. Track only: do not start continuation loops, timers, or scheduled tasks.";

export default function (pi: ExtensionAPI) {
  const read = (ctx: ExtensionContext) => readGoal(ctx.sessionManager.getBranch());
  const refresh = (ctx: ExtensionContext) => {
    if (!ctx.hasUI) return;
    const goal = read(ctx);
    ctx.ui.setStatus("t3-goal", goal ? `Goal: ${goal.status} · ${goal.criteria.filter(x => x.evidence).length}/${goal.criteria.length}` : undefined);
  };
  const apply = (ctx: ExtensionContext, input: Change) => {
    const goal = changeGoal(read(ctx), input);
    pi.appendEntry(ENTRY, { goal });
    refresh(ctx);
    return goal;
  };
  pi.on("session_start", (_event, ctx) => refresh(ctx));
  pi.on("session_tree", (_event, ctx) => refresh(ctx));
  pi.on("context", (event, ctx) => {
    refresh(ctx);
    const goal = read(ctx);
    const messages = event.messages.filter(message => message.role !== "custom" || message.customType !== "t3-goal-context");
    if (goal && goal.status !== "done") messages.push({
      role: "custom", customType: "t3-goal-context", content: `${guidance}\n${describeGoal(goal)}`,
      display: false, timestamp: Date.now(),
    });
    return { messages };
  });
  pi.events.on("t3-goal:context", (data: unknown) => {
    const request = data as { ctx: ExtensionContext; respond: (brief: string) => void };
    const goal = read(request.ctx);
    if (goal?.status === "active") request.respond(`${guidance}\n${describeGoal(goal)}`);
  });
  pi.registerTool({
    name: "t3_goal", label: "Goal", executionMode: "sequential",
    description: "Track the user's session goal and evidence-backed completion criteria. Never creates automatic turns. Criterion indexes are 1-based; check and done require evidence. Set replaces the current goal; clear removes it.",
    parameters: Type.Object({
      action: StringEnum(["show", "set", "add", "check", "uncheck", "block", "resume", "done", "clear"] as const),
      text: Type.Optional(Type.String({ maxLength: 4000 })),
      criteria: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 4000 }), { maxItems: 30 })),
      index: Type.Optional(Type.Integer({ minimum: 1, maximum: 30 })),
      evidence: Type.Optional(Type.String({ maxLength: 4000 })),
    }),
    async execute(_id, input, signal, _update, ctx) {
      signal?.throwIfAborted();
      const goal = input.action === "show" ? read(ctx) : apply(ctx, input);
      return { content: [{ type: "text", text: describeGoal(goal) }], details: { goal } };
    },
  });
  pi.registerCommand("goal", {
    description: "Goal: set TITLE | CRITERION; show; add TEXT; check N EVIDENCE; uncheck N; block REASON; resume; done EVIDENCE; clear",
    async handler(args, ctx) {
      const [action = "show", ...rest] = args.trim().split(/\s+/).filter(Boolean);
      const text = rest.join(" ");
      try {
        let input: Change = { action, text };
        if (action === "set") {
          const [title, ...criteria] = text.split("|").map(x => x.trim());
          input = { action, text: title, criteria };
        } else if (action === "check" || action === "uncheck") {
          input = { action, index: Number(rest[0]), evidence: rest.slice(1).join(" ") };
        } else if (action === "done") input = { action, evidence: text };
        if (action !== "show") apply(ctx, input);
        pi.sendMessage({ customType: "t3-goal-display", content: describeGoal(read(ctx)), display: true }, { triggerTurn: false });
      } catch (error) { ctx.ui.notify(String(error), "error"); }
    },
  });
}

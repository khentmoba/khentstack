import { Type, StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { callT3, selectionMismatch, stableJSON, validateTarget } from "./bridge.ts";

const ENTRY = "t3-subagents:v1";
const Target = Type.Object({
  providerInstanceId: Type.Optional(Type.String({ minLength: 1 })),
  model: Type.Optional(Type.String({ minLength: 1 })),
  options: Type.Optional(Type.Record(Type.String(), Type.Union([Type.String(), Type.Boolean()]))),
});
const instructions = [
  "Use T3-owned delegation, not local Pi subprocesses or top-level thread creation. Check capabilities for provider/model/option IDs.",
  "Supply a unique requestId per delegated task or review round; reuse it only to retry the exact same request. Include the original brief, prior findings, responses, and unresolved objections for every review round.",
  "Delegation defaults to async. End the turn and let T3 deliver completion; status is an on-demand read, not a polling loop. A completed turn with live child work is not a completed task.",
  "T3 owns approval decisions. Pending questions and approvals stay in T3: inspect the returned childThreadId and pending request with native T3 tools. Never approve on behalf of a user.",
  "Local entries are historical receipts, not live task state. Stopping Pi or unloading this extension does not cancel app-owned tasks; cancel explicitly when requested.",
];

type Receipt = { requestId: string; base: string; request: any; expected: any; result?: any };
function receipts(ctx: ExtensionContext, branchOnly = true): Receipt[] {
  const map = new Map<string, Receipt>();
  const entries = branchOnly ? ctx.sessionManager.getBranch() : ctx.sessionManager.getEntries();
  for (const entry of entries) {
    if (entry.type === "custom" && entry.customType === ENTRY) {
      const receipt = entry.data as Receipt;
      map.set(receipt.requestId, receipt);
    }
  }
  return [...map.values()];
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "t3_subagents", label: "T3 subagents", executionMode: "sequential",
    description: "Delegate and manage T3-owned subagents with live model capabilities, preserved approvals, and optional worktree isolation. Actions: capabilities, delegate, status, cancel, list. List is local history only. requestId is mandatory for delegate and must remain stable across retries. Use native T3 tools for pending questions and approval inspection.",
    promptGuidelines: instructions,
    reachesTools: () => ["t3_code", "t3-code", "tool_search"],
    parameters: Type.Object({
      action: StringEnum(["capabilities", "delegate", "status", "cancel", "list"] as const),
      task: Type.Optional(Type.String({ minLength: 1, maxLength: 100000 })),
      requestId: Type.Optional(Type.String({ minLength: 1, maxLength: 160 })),
      title: Type.Optional(Type.String({ maxLength: 200 })),
      role: Type.Optional(StringEnum(["implementation", "research", "review", "design", "test", "general"] as const)),
      target: Type.Optional(Target),
      isolation: Type.Optional(StringEnum(["shared", "worktree"] as const)),
      mode: Type.Optional(StringEnum(["async", "wait"] as const)),
      timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 600000 })),
      includeGoal: Type.Optional(Type.Boolean({ description: "Attach the active goal summary, never conversation history. Default true." })),
      taskId: Type.Optional(Type.String({ minLength: 1 })),
      reason: Type.Optional(Type.String({ maxLength: 2000 })),
    }),
    async execute(_id, input, signal, _update, ctx) {
      signal?.throwIfAborted();
      let result: any;
      let warning: string | undefined;
      if (input.action === "list") {
        result = { historical: true, receipts: receipts(ctx) };
      } else if (input.action === "capabilities") {
        result = await callT3(ctx, "orchestrator_capabilities", {}, signal);
      } else if (input.action === "status" || input.action === "cancel") {
        if (!input.taskId) throw new Error("taskId is required.");
        result = await callT3(ctx, input.action === "status" ? "task_status" : "task_cancel", {
          taskId: input.taskId, ...(input.action === "cancel" && input.reason ? { reason: input.reason } : {}),
        }, signal);
      } else {
        if (!input.task?.trim() || !input.requestId?.trim()) throw new Error("task and a stable requestId are required for delegation.");
        const base = stableJSON(input);
        let receipt = receipts(ctx, false).find(item => item.requestId === input.requestId);
        if (receipt && receipt.base !== base) throw new Error("requestId already belongs to a different request. Use a new ID for new work or a new review round.");
        if (!receipt) {
          const cap = await callT3(ctx, "orchestrator_capabilities", {}, signal);
          const expected = validateTarget(cap, input.target);
          let brief = "";
          if (input.includeGoal !== false) pi.events.emit("t3-goal:context", { ctx, respond: (text: string) => { brief = text; } });
          const request = {
            task: brief ? `${input.task}\n\nParent goal context (only the assigned task is delegated):\n${brief}` : input.task,
            clientRequestId: input.requestId,
            target: expected,
            mode: input.mode ?? "async",
            ...(input.title ? { title: input.title } : {}),
            ...(input.role ? { role: input.role } : {}),
            ...(input.isolation ? { isolation: input.isolation } : {}),
            ...(input.timeoutMs ? { timeoutMs: input.timeoutMs } : {}),
          };
          receipt = { requestId: input.requestId, base, request, expected };
          pi.appendEntry(ENTRY, receipt);
        }
        try {
          result = await callT3(ctx, "delegate_task", receipt.request, signal);
        } catch (error) {
          throw new Error(`Delegation outcome may be unknown. Retry only with the same requestId (${input.requestId}) and identical arguments. ${error}`);
        }
        receipt = { ...receipt, result };
        pi.appendEntry(ENTRY, receipt);
        warning = selectionMismatch(receipt.expected, result);
        if (!result.taskId) warning = "T3 did not return a taskId. Inspect the response before retrying.";
      }
      const data = { result, ...(warning ? { warning } : {}) };
      let text = JSON.stringify(data, null, 2);
      if (text.length > 45000) text = text.slice(0, 45000) + "\n[Truncated. Use native T3 task/thread tools for targeted reads; full data is in tool details.]";
      return { content: [{ type: "text", text }], details: data, ...(warning ? { isError: true } : {}) };
    },
  });
  pi.registerCommand("subagents", {
    description: "Show historical T3 delegation receipts; /subagents help for usage",
    async handler(args, ctx) {
      const text = args.trim() === "help" ? instructions.join("\n") : receipts(ctx).map(item =>
        `${item.requestId}: ${item.result?.taskId ?? "outcome unknown — retry with original request"} · ${item.result?.status ?? "unconfirmed"}`,
      ).join("\n") || "No delegation receipts on this session branch. Ask Pi to delegate a task with t3_subagents.";
      pi.sendMessage({ customType: "t3-subagents-display", content: `Historical receipts (not live status)\n${text}`, display: true }, { triggerTurn: false });
    },
  });
}

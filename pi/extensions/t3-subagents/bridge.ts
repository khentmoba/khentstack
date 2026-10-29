import type { ExtensionToolContext } from "@earendil-works/pi-coding-agent";

export function decodeResult(result: any): any {
  let value = result;
  for (let i = 0; i < 6; i++) {
    if (value?.isError) throw new Error(JSON.stringify(value));
    if (value?.structuredContent) { value = value.structuredContent; continue; }
    if (value?.content && !value.taskId && !value.providers) {
      const text = value.content.filter((x: any) => x.type === "text").map((x: any) => x.text).join("\n");
      try { value = JSON.parse(text); continue; } catch { throw new Error(text || "T3 returned no structured result."); }
    }
    if (!value || typeof value !== "object") throw new Error("T3 returned an invalid result.");
    return value;
  }
  throw new Error("T3 result nesting exceeded the supported limit.");
}

export function findTool(tools: readonly { name: string }[], operation: string): string | undefined {
  const names = tools.filter(tool => {
    const name = tool.name.replace(/-/g, "_");
    return name === `mcp__t3_code__${operation}`;
  });
  if (names.length > 1) throw new Error(`Ambiguous T3 tool: ${operation}`);
  return names[0]?.name;
}

export async function callT3(ctx: ExtensionToolContext, operation: string, args: unknown, signal?: AbortSignal): Promise<any> {
  signal?.throwIfAborted();
  let name = findTool(ctx.tools, operation);
  if (!name && ctx.tools.some(tool => tool.name === "tool_search")) {
    const search = await ctx.executeTool("tool_search", { query: `t3-code ${operation}`, limit: 2 }, { signal });
    if (search.isError) throw new Error("T3 tool discovery was blocked or failed; no fallback was attempted.");
    name = findTool(ctx.tools, operation);
  }
  if (!name) throw new Error(`T3 ${operation} is unavailable. Use this extension inside T3 Code with its MCP tools enabled. No local agents or shell fallback were started.`);
  const outcome = await ctx.executeTool(name, args, { signal });
  if (outcome.isError) throw new Error(JSON.stringify(outcome.result));
  return decodeResult(outcome.result);
}

export function stableJSON(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

export function optionMap(options: any): Record<string, string | boolean> {
  return Array.isArray(options) ? Object.fromEntries(options.map(x => [x.id, x.value])) : options ?? {};
}

export function validateTarget(capabilities: any, target: any = {}): { providerInstanceId: string; model: string; options: Record<string, string | boolean> } {
  const providerInstanceId = target.providerInstanceId ?? capabilities.inheritedProviderInstanceId;
  const model = target.model ?? capabilities.inheritedModel;
  const provider = capabilities.providers?.find((x: any) => x.providerInstanceId === providerInstanceId);
  if (!provider?.canRunChildTask) throw new Error(`Provider ${providerInstanceId} cannot run child tasks.`);
  const selected = provider.models?.find((x: any) => x.id === model);
  if (!selected) throw new Error(`Model ${model} is not advertised by ${providerInstanceId}. Select a model from capabilities.`);
  const inherited = providerInstanceId === capabilities.inheritedProviderInstanceId && model === capabilities.inheritedModel;
  const explicit = target.options;
  const options = explicit && Object.keys(explicit).length === 0 ? {} : {
    ...(inherited ? optionMap(capabilities.inheritedOptions) : {}), ...optionMap(explicit),
  };
  for (const [id, value] of Object.entries(options)) {
    const descriptor = selected.options?.find((x: any) => x.id === id);
    if (!descriptor || (descriptor.type === "boolean" ? typeof value !== "boolean" : !descriptor.options?.some((x: any) => x.id === value))) {
      throw new Error(`Unsupported model option ${id}=${value} for ${providerInstanceId}/${model}.`);
    }
  }
  return { providerInstanceId, model, options };
}

export function selectionMismatch(expected: ReturnType<typeof validateTarget>, actual: any): string | undefined {
  if (expected.providerInstanceId !== actual.providerInstanceId || expected.model !== actual.model) return "T3 returned a different provider or model.";
  const options = optionMap(actual.options);
  for (const [key, value] of Object.entries(expected.options)) {
    if (options[key] !== value) return `T3 did not confirm option ${key}=${value}.`;
  }
  const unexpected = Object.keys(options).filter(key => !(key in expected.options));
  if (unexpected.length) return `T3 returned unexpected model options: ${unexpected.join(", ")}.`;
}

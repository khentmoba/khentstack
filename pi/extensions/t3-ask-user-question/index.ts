import { Type } from '@earendil-works/pi-ai';
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';

const Option = Type.Object({
  label: Type.String({ minLength: 1, maxLength: 60 }),
  description: Type.String({ minLength: 1, maxLength: 1000 }),
  preview: Type.Optional(Type.String({ maxLength: 8000 })),
});
const Parameters = Type.Object({
  questions: Type.Array(Type.Object({
    header: Type.String({ minLength: 1, maxLength: 16 }),
    question: Type.String({ minLength: 1, maxLength: 4000 }),
    multiSelect: Type.Optional(Type.Boolean({ default: false })),
    options: Type.Array(Option, { minItems: 2, maxItems: 4 }),
  }), { minItems: 1, maxItems: 4 }),
});
type Question = { header: string; question: string; multiSelect?: boolean; options: { label: string; description: string; preview?: string }[] };
type Answer = { questionIndex: number; question: string; kind: 'option' | 'custom' | 'multi'; answer: string | null; selected?: string[]; preview?: string };
const CUSTOM = 'Type something.';
const CLEAR = 'Clear custom answer';

function validate(questions: Question[]) {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 4) throw new Error('Supply 1–4 structured questions.');
  for (const q of questions) {
    if (!q || typeof q.question !== 'string' || !q.question.trim() || q.question.length > 4000 ||
      typeof q.header !== 'string' || !q.header.trim() || q.header.length > 16 ||
      (q.multiSelect !== undefined && typeof q.multiSelect !== 'boolean') ||
      !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) throw new Error('Each question needs a short header, question text, and 2–4 options in options[].');
    const labels = new Set<string>();
    for (const o of q.options) {
      if (!o || typeof o.label !== 'string' || !o.label.trim() || o.label.length > 60 ||
        typeof o.description !== 'string' || !o.description.trim() || o.description.length > 1000 ||
        (o.preview !== undefined && (typeof o.preview !== 'string' || o.preview.length > 8000))) throw new Error('Each option needs a label and description; preview must be text.');
      const key = o.label.trim().toLowerCase();
      if (labels.has(key) || ['other', 'type something.', 'type something', 'done', 'clear custom answer'].includes(key)) throw new Error('Use distinct option labels; custom-answer and Done controls are supplied automatically.');
      labels.add(key);
    }
  }
}

async function ask(ctx: ExtensionContext, q: Question, questionIndex: number, count: number, signal?: AbortSignal): Promise<Answer | undefined> {
  const selected = new Set<number>();
  let custom: string | null = null;
  const title = `[${q.header}] ${q.question}${count > 1 ? ` (${questionIndex + 1}/${count})` : ''}${q.multiSelect ? '\nSelect choices to toggle them, then choose Done.' : ''}`;
  const base = { questionIndex, question: q.question };
  for (;;) {
    signal?.throwIfAborted();
    const rows = q.options.map((o, i) => `${q.multiSelect ? (selected.has(i) ? '[x] ' : '[ ] ') : ''}${o.label} — ${o.description}${o.preview ? `\n${o.preview}` : ''}`);
    const done = `Done (${selected.size} selected${custom !== null ? ', custom answer added' : ''})`;
    const controls = [...rows, CUSTOM, ...(q.multiSelect ? [...(custom !== null ? [CLEAR] : []), done] : [])];
    const value = await ctx.ui.select(title, controls, { signal });
    signal?.throwIfAborted();
    if (value === undefined) return undefined;
    if (!value.trim()) continue;
    if (q.multiSelect && value === done) return { ...base, kind: 'multi', selected: q.options.filter((_, i) => selected.has(i)).map(o => o.label), answer: custom };
    if (q.multiSelect && custom !== null && value === CLEAR) { custom = null; continue; }
    if (value === CUSTOM) {
      const typed = await ctx.ui.input(`[${q.header}] ${q.question}\nYour answer:`, 'Type your answer', { signal });
      signal?.throwIfAborted();
      if (!typed?.trim()) continue;
      if (q.multiSelect) { custom = typed; continue; }
      return { ...base, kind: 'custom', answer: typed };
    }
    let index = rows.indexOf(value);
    if (index < 0) index = q.options.findIndex(o => o.label === value);
    if (index >= 0) {
      if (q.multiSelect) { if (selected.has(index)) selected.delete(index); else selected.add(index); continue; }
      const o = q.options[index];
      return { ...base, kind: 'option', answer: o.label, ...(o.preview ? { preview: o.preview } : {}) };
    }
    if (q.multiSelect) { custom = value; continue; }
    return { ...base, kind: 'custom', answer: value };
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'ask_user_question', label: 'Ask user (T3)', executionMode: 'sequential',
    description: 'Ask 1–4 structured questions using T3 Code native selectable rows. Put every choice in options[], never embed a numbered choice list in question text. Multi-select uses clickable toggles followed by Done. A custom-answer row is automatic. Dismissal cancels the questionnaire; partial answers are not a completed response.',
    promptGuidelines: [
      'Use ask_user_question for choices. Each question has a short header, question text, and 2–4 options with label and description. Put choices in options[], not in the question.',
      'Set multiSelect only when multiple answers are valid. The extension supplies custom-answer and Done controls. Do not author Other or Type something. options.',
      'T3 uses one native dialog per question. Previews are option text, not a side-by-side pane. A cancelled questionnaire is incomplete; do not infer answers to unanswered questions.',
    ],
    parameters: Parameters,
    async execute(_id, input, signal, _update, ctx) {
      signal?.throwIfAborted();
      validate(input.questions);
      if (!ctx.hasUI || typeof ctx.ui.select !== 'function' || typeof ctx.ui.input !== 'function') throw new Error('UI unavailable: questions were not shown. Do not treat this as a user decline.');
      const answers: Answer[] = [];
      let cancelled = false;
      for (const [i, q] of input.questions.entries()) {
        const answer = await ask(ctx, q, i, input.questions.length, signal);
        if (!answer) { cancelled = true; break; }
        answers.push(answer);
      }
      const details = { answers, cancelled };
      return { content: [{ type: 'text', text: JSON.stringify(details) }], details };
    },
  });
}

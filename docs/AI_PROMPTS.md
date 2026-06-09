# AI Prompt Architecture

All prompts live in `src/lib/ai/prompts.ts`. When `OPENAI_API_KEY` is set they are sent to OpenAI (`OPENAI_MODEL`, default `gpt-4o`) with JSON-mode responses; otherwise the deterministic template engine in `src/lib/ai/email.ts` produces equivalent output.

## System prompt (sales persona)

A single `SALES_SYSTEM_PROMPT` establishes Orca Coast's voice: confident, warm, specific, never pushy; lead with the prospect's mission and the value to families; reference real Orca Coast projects as social proof; keep first-touch emails under ~130 words with one clear CTA.

## Email generation

`buildEmailPrompt({ lead, emailType, campaignFocus, similarProject })` injects:

- Organization name, industry, city/region/country
- Recipient name + role (the top decision maker)
- Campaign focus points (from the vertical template)
- The single most similar Orca Coast project (from lookalike matching)

The model returns JSON: `{ subject, body, cta, objectionHandling }`.

### Email types

| Type | Intent |
|------|--------|
| `first_touch` | Cold open: specific observation → family value → social proof → low-friction CTA |
| `follow_up` | Brief nudge with one new angle |
| `value` | Useful insight, no hard ask |
| `case_study` | A similar project: challenge → install → outcome |
| `final_check_in` | Polite break-up, door left open |

## Proposal generation

`buildProposalPrompt(lead, similarProject)` produces a project summary, recommended concept, scope of work, and a budget estimate range (the range itself comes from the deterministic `estimateValue()` so it stays consistent with the rest of the engine).

## Why a deterministic fallback?

1. **Demonstrability** — the product works in any environment, including CI and this repo's offline sessions.
2. **Cost control** — bulk operations (e.g. generating 100 first-touch emails for the weekly territory list) don't require 100 API calls to be reviewable.
3. **Determinism** — useful for tests and snapshotting.

The template engine is personalized (name, role, city, industry, similar project) so its output is genuinely usable, not placeholder text.

## Prompt-tuning guidance

- Keep the system prompt as the single source of voice; per-task prompts only add context.
- Pass the lookalike `similarProject` into every generation — concrete social proof measurably lifts reply rates.
- For new verticals, add a `CadenceStep`/focus set in `src/lib/data/campaigns.ts` rather than branching prompt logic.

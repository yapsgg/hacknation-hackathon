# Pitch deck outline (5 slides)

Speaker notes in italics. All numbers come from the seeded synthetic case.

## 1. The problem

**Juniors build flawless models on unchallenged inputs.**
$80k + $110k = $190k ARR, a "one-time" $4M relocation add-back, capex cut to
1.8% against a 4.1% history. Each flatters the purchase price; each is wrong in
the documents. *The knowledge that catches these lives in a senior partner's
head and is never written down.*

## 2. The product: Capture, Map, Teach

- **Capture:** the apprentice watches the partner's screen and asks one short
  question, at a natural pause, about something on screen.
- **Map:** gaps become a debrief; the partner confirms; the result is a
  reviewable Work Map of steps, judgment calls and guardrails.
- **Teach:** a tutor stops a junior's unsafe Save with the partner's own
  reasoning and replays the moment.

*Screenshot: Capture screen with Governor line, Work Map, and the blocked Save.*

## 3. The five Apprentice Test answers (one slide)

1. **When to ask:** a deterministic Question Governor (voice silence, input
   idle, no scrolling, 45 s cooldown, 5 per 10 min, recent trigger). The model
   never decides when to interrupt.
2. **What to ask:** candidate questions scored on reveal value, on-screen
   anchor and novelty; anything the screen already answers is dropped.
3. **When it has understood:** the debrief closes the gaps and the partner's
   teach-back confirmation (with corrections counted) gates the rules.
4. **Whether the new hire learned:** Beacon is a deal the partner never saw;
   the tutor catches an over-learned rule and scores mastery per rule.
5. **Trust:** off the record deletes the window; transcripts redacted before
   storage; frame retention is opt-in; unconfirmed rules are never taught.

## 4. How it is built (and what is honest)

ElevenAgents (voice interviewer + tutor), Gemini vision behind a server-side
redactor, Presidio, Supabase, Next.js on Vercel. Deterministic rules decide
timing and blocking; models read the screen and speak.

Honest status: a synthetic-data demo. Live capture works end to end on
synthetic screens; real data needs human sign-in, hosted redaction and a shared
rate limiter. `GET /api/system/readiness` says so itself.

## 5. Moonshot: deal memory

Every senior's scrub patterns accumulate into a firm-wide diligence playbook
that updates itself and asks only about what is new. Today's Work Map becomes
agent-ready: an agent runs the junior steps and halts at the same guardrails
(escalate to QoE or legal) while humans keep the judgment calls. Later,
anonymised across firms, a library of how diligence is really done.

*Optional stretch slide: a German-speaking expert with an English tutor, and
the Work Map exported as a stop-and-escalate instruction file (the Agent export
page already produces it).*

# Demo script (about 4 minutes)

All data is fictional (Project Atlas and Project Beacon). Say so once, early:
the "Demo data · fictional deals" tag is on screen throughout.

**One-sentence pitch:** the apprentice watches a senior partner challenge a
seller's numbers, learns *why*, and then stops a junior analyst before the same
mistake is saved, quoting the partner's own reasoning.

Setup before going on stage: open `/apprentice` on the production URL (or
`localhost`), landing page visible; second tab on `/deal-desk`; Voice preview
on; microphone and screen share already approved in Chrome. If anything fails,
use the recorded session (below); it needs no network, mic or keys.

## 1. Capture: when and what to ask (60 s)

1. Landing page: "Partner-grade skepticism for every analyst." Click **See the
   demo** or **Open dashboard**, then **Capture > Live session**.
2. **Play demo session** at 16x. Narrate: Sabine is working the Atlas data room
   into an LBO model.
3. Point at the Governor line and the signals: the apprentice **holds** while
   she types, reads or talks, and only asks at a natural pause, always about
   something on screen.
4. Three questions appear: Acme ARR "$190,000 to $110,000. Why not add both
   contracts?" (an **on-screen** contract clause), the $4M relocation add-back,
   and capex versus history. Open **Why this question** on one: score, trigger,
   the alternatives it did not ask.
5. Click **Go off the record** briefly. Say: "Nothing is heard, seen or stored.
   Only the time span is kept."

Live variant (only if rehearsed twice): **Start live capture**, share a window
showing Source files, open the Acme Amendment, stay quiet, and a question
appears; talk over the next one to show it is held.

## 2. Debrief and Work Map: when it has understood (60 s)

1. **Start the debrief.** The apprentice found 3 open gaps by comparing screen
   events with what she said (for example "what do you do when the VDR has no
   amendment for a contract?"). Answer them (**Ask**, then the recorded answer).
2. Teach-back: the apprentice explains the process back; confirm each line, and
   correct one (correction count increases and approval is revoked until
   re-confirmed). **Confirm teach-back as Sabine.**
3. **Work Map:** 7 steps, judgment calls, guardrails; click a step and **Replay**
   to see her screen moment and her words. Say: "Nothing becomes a rule until
   she confirms it. The tutor only uses confirmed rules."

If the live build is shaky: **Overview > Load finished session** (or the
landing page's **See the finished demo**) loads the completed session in one
click.

## 3. Teach: did the new hire learn (60 s)

1. **Teach this to Priya** (Project Beacon, a deal Sabine never saw).
2. Predict: "Crestline has an $80,000 MSA and a $110,000 software agreement.
   What is the ARR?" Pick $190,000 (the wrong, tempting answer).
3. Enter 190,000 and **Save inputs and run debt schedule**. The tutor stops it:
   the 2025 agreement "supersedes and replaces" the MSA, with Sabine's words.
   Correct it to $110,000.
4. Add-back "Accept $4.0M" is also stopped (recurs every year in the invoices).
   Show the **Source files** page: the invoices are right there.
5. Second stage: capex 1.6% is blocked against a 4.0% history; escalate.
6. **Results:** mastery per rule, inputs caught before the model.

## 4. Live Tutor on the Deal Desk (45 s, optional, needs ElevenLabs)

`/deal-desk` > **Start voice tutor**. Change Acme ARR to 190000 and Save: Save
is frozen with the expert's reason; ask "why?" aloud; the tutor replays the
moment. Say "off the record": capture pauses and that window is purged.

## 5. Trust, in one breath (15 s)

**Trust and privacy** page: off-the-record deletes the window, transcripts are
redacted before storage, frames are not retained unless the expert allows it,
and unconfirmed rules never reach the tutor. State honestly: this is a
synthetic-data demo; real data needs human sign-in and hosted redaction
(readiness endpoint says so).

## Recorded fallback

The recorded session is the default path in the app: **Play demo session** or
**Skip to end** works with no mic, screen share, keys, or network, and
**Overview > Load finished session** jumps to a completed, signed-off session.
Keep a screen recording of the full flow as a last resort (see
`docs/DRY_RUN_CHECKLIST.md`).

## Lines to avoid

- Do not claim vision is "live" unless the Live capture panel shows frames and
  events at that moment.
- Do not claim the system is ready for real deal data.

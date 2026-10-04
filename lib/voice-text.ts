// Text helpers shared by the live voice panels.

// Sent as a user message when the Question Governor grants a slot. A contextual
// update alone does not make the agent speak, so this short message prompts the
// question; it is app control text, not something the expert said.
export const GOVERNOR_NUDGE_PREFIX = "[Governor]"
export const GOVERNOR_NUDGE = `${GOVERNOR_NUDGE_PREFIX} Slot granted. Ask your one question now.`

export const isGovernorNudge = (text: string) =>
  text.trim().startsWith(GOVERNOR_NUDGE_PREFIX)

// The expressive voice model reads lowercase stage directions such as [slow] or
// [calm]. Strip them from stored and displayed text; uppercase redaction markers
// such as [PERSON] are left untouched.
export const stripVoiceTags = (text: string) =>
  text.replace(/\[[a-z][a-z '-]{0,30}\]\s?/g, "").replace(/\s{2,}/g, " ").trim()

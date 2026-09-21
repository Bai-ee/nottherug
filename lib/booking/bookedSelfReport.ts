/**
 * A one-question prompt shown beside the questionnaire after someone comes
 * back from the scheduler: "did you book a time?"
 *
 * It exists because every automatic booking signal we have — the
 * appointment_completed event and the lead's bookedSelfReported flag alike —
 * comes from the same Calendly postMessage, which only arrives if that
 * message reaches the page and passes its origin check. When it does not, a
 * real booking leaves no trace at all. Asking the visitor is the one signal
 * that does not depend on it.
 *
 * A tiny module store rather than storage or context: the modal and the
 * questionnaire are siblings on one page in one tab, and the answer is only
 * meaningful for the visit that just happened.
 */

type PendingPrompt = { email: string; source: string } | null;

let pending: PendingPrompt = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Called when a visitor leaves the scheduler without a verified completion. */
export function requestBookedSelfReport(email: string, source: string): void {
  pending = email ? { email, source } : null;
  emit();
}

export function clearBookedSelfReport(): void {
  pending = null;
  emit();
}

export function subscribeBookedSelfReport(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getBookedSelfReport(): PendingPrompt {
  return pending;
}

/** The server never has a pending prompt, so it renders nothing. */
export function getServerBookedSelfReport(): PendingPrompt {
  return null;
}

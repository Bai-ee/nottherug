'use client';

import type { RecordReview } from '@/lib/testing/leadReview';

const REASON_TEXT: Record<string, string> = {
  override: 'marked by an admin',
  device: 'from a marked test device',
  session: 'from a marked test session',
  build: 'test build',
};

/** Badges: "Test" (and why) and "Same email ×N — review". Never inferred from content. */
export function RecordFlags({ review }: { review?: RecordReview }) {
  if (!review) return null;
  return (
    <span className="admin-record-flags">
      {review.testReason ? (
        <span className="badge badge-gold" title={`Test — ${REASON_TEXT[review.testReason] ?? review.testReason}`}>Test</span>
      ) : null}
      {review.sameEmailCount > 0 ? (
        <span className="badge badge-terra" title="Another submission in this list uses the same email. Review before treating as test or duplicate.">
          Same email ×{review.sameEmailCount + 1}
        </span>
      ) : null}
    </span>
  );
}

/** Mark as test / confirm real / clear. `onMark(null)` clears an earlier mark. */
export function TestMarkControls({
  id,
  review,
  busy,
  onMark,
}: {
  id: string;
  review?: RecordReview;
  busy: boolean;
  onMark: (test: boolean | null) => void;
}) {
  const markedTestByAdmin = review?.testReason === 'override';
  const testByOtherRule = review?.testReason && review.testReason !== 'override';
  return (
    <div className="admin-test-mark-row" id={`admin-test-mark-${id}`} onClick={(e) => e.stopPropagation()}>
      {markedTestByAdmin || review?.confirmedReal ? (
        <button type="button" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" disabled={busy} onClick={() => onMark(null)}>
          {markedTestByAdmin ? 'Unmark test' : 'Clear “real” mark'}
        </button>
      ) : null}
      {!markedTestByAdmin ? (
        <button type="button" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" disabled={busy} onClick={() => onMark(true)}>
          Mark as test
        </button>
      ) : null}
      {testByOtherRule && !review?.confirmedReal ? (
        <button type="button" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" disabled={busy} onClick={() => onMark(false)}>
          Not a test (count as real)
        </button>
      ) : null}
    </div>
  );
}

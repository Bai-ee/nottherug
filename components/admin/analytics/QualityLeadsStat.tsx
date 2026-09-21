'use client';

/**
 * The people who answered everything — the other half of the story the
 * appointments card tells. A booking says someone wants a walk; a finished
 * questionnaire says the walker has what they need before the meet and greet.
 *
 * Deliberately a separate card rather than a qualifier on the appointments
 * number: the two measure different things and summing or nesting them would
 * imply a funnel that this journey does not have (booking comes first, and
 * answering is optional).
 */
export function QualityLeadsStat({
  completedQuestionnaires,
  inquiries,
}: {
  /** Leads with every question answered. Null in test mode / when the leads query failed. */
  completedQuestionnaires: number | null;
  /** Completed questionnaires overall, for the "of N" reading. */
  inquiries: number | null;
}) {
  return (
    <section id="admin-analytics-quality-leads-panel" className="card card-pad">
      <div className="stamp-label">Fully Answered</div>
      <div className="hero-stat-item">
        <div className="hero-stat-num">
          {completedQuestionnaires === null ? 'Not measured' : completedQuestionnaires.toLocaleString('en-US')}
        </div>
        <div className="hero-stat-label">Complete Questionnaires</div>
      </div>
      <p className="form-note">
        {completedQuestionnaires === null || inquiries === null
          ? 'Leads who answered every question.'
          : `Leads who answered every question, out of ${inquiries.toLocaleString('en-US')} ${
              inquiries === 1 ? 'inquiry' : 'inquiries'
            }.`}
      </p>
    </section>
  );
}

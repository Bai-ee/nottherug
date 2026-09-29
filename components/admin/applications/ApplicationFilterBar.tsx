'use client';

import type { BenchStage } from '@/lib/bench/contract';

export type ApplicationSortOrder = 'newest' | 'queue';

/** Stage groups the owner filters by; each maps to the pipeline stages it covers. */
export const APPLICATION_STAGE_FILTERS: Array<{ value: string; label: string; stages: BenchStage[] | null }> = [
  { value: 'all', label: 'All applications', stages: null },
  { value: 'new', label: 'New (to review)', stages: ['applied', 'review'] },
  { value: 'in_progress', label: 'Shadow walk → offer', stages: ['shadow_invited', 'shadow_scheduled', 'shadow_done', 'offer_conditional', 'background_check'] },
  { value: 'team', label: 'On the team', stages: ['bench', 'fulltime'] },
  { value: 'closed', label: 'Closed (rejected / inactive)', stages: ['rejected', 'inactive'] },
];

/**
 * The Team Applications counterpart of components/admin/leads/LeadFilterBar.tsx:
 * same card, same field system, with a stage filter in place of the leads'
 * completeness sort.
 */
export function ApplicationFilterBar({
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  stageFilter,
  onStageFilterChange,
  loading,
  filteredCount,
  totalCount,
  cap,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  /** 'newest' is submission order; 'queue' is the review-queue order (fills a gap, then oldest). */
  sortBy: ApplicationSortOrder;
  onSortChange: (value: ApplicationSortOrder) => void;
  stageFilter: string;
  onStageFilterChange: (value: string) => void;
  loading: boolean;
  filteredCount: number;
  totalCount: number;
  cap: number | null;
}) {
  return (
    <div id="admin-applications-filter-panel" className="card card-pad">
      <div id="admin-applications-filter-row" className="form-row" style={{ marginBottom: 0 }}>
        <div className="form-group" id="admin-applications-search-group">
          <label htmlFor="admin-applications-search-input">Search</label>
          <input
            id="admin-applications-search-input"
            className="form-control"
            placeholder="Search name, email, phone, neighborhood, answers…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        <div className="form-group" id="admin-applications-stage-group">
          <label htmlFor="admin-applications-stage-select">Show</label>
          <select
            id="admin-applications-stage-select"
            className="form-control"
            value={stageFilter}
            onChange={(e) => onStageFilterChange(e.target.value)}
          >
            {APPLICATION_STAGE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group" id="admin-applications-sort-group">
          <label htmlFor="admin-applications-sort-select">Sort by</label>
          <select
            id="admin-applications-sort-select"
            className="form-control"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value === 'queue' ? 'queue' : 'newest')}
          >
            <option value="newest">Newest first</option>
            <option value="queue">Review queue order</option>
          </select>
        </div>
      </div>

      <div id="admin-applications-filter-meta-row">
        <span id="admin-applications-result-count" className="form-note" style={{ margin: 0 }}>
          {loading ? 'Loading…' : `${filteredCount} of ${totalCount} application${totalCount === 1 ? '' : 's'}`}
        </span>
        {!loading && cap !== null && totalCount >= cap ? (
          <span id="admin-applications-cap-notice" className="form-note text-terra" style={{ margin: 0 }}>
            Showing the most recent {cap} applications. Older ones are not included.
          </span>
        ) : null}
      </div>
    </div>
  );
}

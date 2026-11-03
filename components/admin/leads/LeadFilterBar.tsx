'use client';

export type LeadSortOrder = 'newest' | 'complete';
/** All records, questionnaires/booking emails only, or "Request another time" submissions only. */
export type LeadShowFilter = 'all' | 'leads' | 'requests';

export function LeadFilterBar({
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  show = 'all',
  onShowChange,
  loading,
  filteredCount,
  totalCount,
  cap,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  /** 'newest' matches the server's own order; 'complete' surfaces the
   *  most-answered leads first so the founder sees the serious ones. */
  sortBy: LeadSortOrder;
  onSortChange: (value: LeadSortOrder) => void;
  show?: LeadShowFilter;
  onShowChange?: (value: LeadShowFilter) => void;
  loading: boolean;
  filteredCount: number;
  totalCount: number;
  /** The route's read cap (see app/admin/leads/route.ts) — used to say "most recent N" truthfully instead of implying this is every lead. */
  cap: number | null;
}) {
  return (
    <div id="admin-leads-filter-panel" className="card card-pad">
      <div id="admin-leads-filter-row" className="form-row" style={{ marginBottom: 0 }}>
        <div className="form-group" id="admin-leads-search-group">
          <label htmlFor="leads-search-input">Search</label>
          <input
            id="leads-search-input"
            className="form-control"
            placeholder="Search name, email, phone, dog, neighborhood…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        {onShowChange ? (
          <div className="form-group" id="admin-leads-show-group">
            <label htmlFor="leads-show-select">Show</label>
            <select
              id="leads-show-select"
              className="form-control"
              value={show}
              onChange={(e) => onShowChange(e.target.value === 'leads' || e.target.value === 'requests' ? e.target.value : 'all')}
            >
              <option value="all">Everything</option>
              <option value="leads">Questionnaires &amp; bookings</option>
              <option value="requests">Time requests</option>
            </select>
          </div>
        ) : null}

        <div className="form-group" id="admin-leads-sort-group">
          <label htmlFor="leads-sort-select">Sort by</label>
          <select
            id="leads-sort-select"
            className="form-control"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value === 'complete' ? 'complete' : 'newest')}
          >
            <option value="newest">Newest first</option>
            <option value="complete">Most answered first</option>
          </select>
        </div>
      </div>

      <div id="admin-leads-filter-meta-row">
        <span id="admin-leads-result-count" className="form-note" style={{ margin: 0 }}>
          {loading ? 'Loading…' : `${filteredCount} of ${totalCount} record${totalCount === 1 ? '' : 's'}`}
        </span>
        {!loading && cap !== null && totalCount >= cap ? (
          <span id="admin-leads-cap-notice" className="form-note text-terra" style={{ margin: 0 }}>
            Showing the most recent {cap} leads. Older leads are not included.
          </span>
        ) : null}
      </div>
    </div>
  );
}

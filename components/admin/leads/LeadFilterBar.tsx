'use client';

export type LeadSortOrder = 'newest' | 'complete';

export function LeadFilterBar({
  query,
  onQueryChange,
  sortBy,
  onSortChange,
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
            placeholder="Search name, email, dog, neighborhood…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

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
          {loading ? 'Loading…' : `${filteredCount} of ${totalCount} lead${totalCount === 1 ? '' : 's'}`}
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

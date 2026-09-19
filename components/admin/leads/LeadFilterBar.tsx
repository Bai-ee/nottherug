'use client';

export function LeadFilterBar({
  query,
  onQueryChange,
  sourceFilter,
  onSourceFilterChange,
  sources,
  loading,
  filteredCount,
  totalCount,
  cap,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  sources: string[];
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
        <div className="form-group" id="admin-leads-source-group">
          <label htmlFor="leads-source-select">Source</label>
          <select
            id="leads-source-select"
            className="form-control form-select"
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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

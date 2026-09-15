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
    <div id="leads-filter-toolbar" className="leads-toolbar">
      <input
        id="leads-search-input"
        className="leads-input"
        placeholder="Search name, email, dog, neighborhood…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        style={{ minWidth: 280 }}
      />
      <select
        id="leads-source-select"
        className="leads-select"
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
      <span id="leads-result-count" className="leads-count">
        {loading ? 'Loading…' : `${filteredCount} of ${totalCount} lead${totalCount === 1 ? '' : 's'}`}
      </span>
      {!loading && cap !== null && totalCount >= cap ? (
        <div id="leads-cap-notice" className="leads-cap-notice">
          Showing the most recent {cap} leads. Older leads are not included.
        </div>
      ) : null}
    </div>
  );
}

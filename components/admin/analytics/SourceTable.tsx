'use client';

import type { SourceRow } from '@/lib/analytics/report';

/** Owner decision 8: referrer hostname, direct/unknown, or a bounded campaign
 *  slug — never arbitrary UTM text. `source` arrives pre-formatted as
 *  'campaign:<slug>' | 'referral:<hostname>' | 'direct'; this only splits it
 *  for a friendlier label. */
function formatSource(source: string): { kind: string; value: string } {
  if (source.startsWith('campaign:')) return { kind: 'Campaign', value: source.slice('campaign:'.length) };
  if (source.startsWith('referral:')) return { kind: 'Referral', value: source.slice('referral:'.length) };
  return { kind: 'Direct', value: 'includes referrer-stripped traffic' };
}

/**
 * Presentation: paper card; rows use the homepage's own report-card row
 * vocabulary (rc-row/rc-label/rc-value) instead of a <table> — see
 * app/admin/admin.css for the id-scoped rule that spaces rc-row's label and
 * value to the row's opposite edges here.
 */
export function SourceTable({ sources }: { sources: SourceRow[] }) {
  return (
    <section id="admin-analytics-source-table" className="card card-pad">
      <div className="stamp-label">Traffic Sources</div>
      <div className="admin-analytics-panel-body">
        {sources.length === 0 ? (
          <p className="text-mid">No sessions in range yet.</p>
        ) : (
          <div id="admin-analytics-source-rows">
            {sources.map((row) => {
              const { kind, value } = formatSource(row.source);
              return (
                <div key={row.source} className="rc-row">
                  <span><span className="rc-label">{kind}</span> {value}</span>
                  <span className="rc-value">{row.sessions.toLocaleString('en-US')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

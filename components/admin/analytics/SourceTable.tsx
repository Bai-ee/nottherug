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

export function SourceTable({ sources }: { sources: SourceRow[] }) {
  return (
    <section id="admin-analytics-source-table" className="analytics-panel">
      <div className="analytics-panel-head">
        <h2 className="analytics-panel-title">Traffic Sources</h2>
      </div>
      <div className="analytics-panel-body">
        {sources.length === 0 ? (
          <div className="analytics-empty">No sessions in range yet.</div>
        ) : (
          <table className="analytics-table">
            <thead>
              <tr><th>Source</th><th className="analytics-table-num">Sessions</th></tr>
            </thead>
            <tbody>
              {sources.map((row) => {
                const { kind, value } = formatSource(row.source);
                return (
                  <tr key={row.source}>
                    <td><span className="analytics-table-kind">{kind}</span> {value}</td>
                    <td className="analytics-table-num">{row.sessions.toLocaleString('en-US')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

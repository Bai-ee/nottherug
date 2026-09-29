import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FunnelPanel } from '@/components/admin/analytics/FunnelPanel';
import { buildEmptyReport } from '@/components/admin/analytics/emptyReport';

describe('FunnelPanel', () => {
  it('labels the no-scheduler row "Saved, scheduler not opened" and drops the phone wording', () => {
    const funnel = { ...buildEmptyReport('7d').funnel, savedSchedulerNotOpened: 4 };
    const html = renderToStaticMarkup(createElement(FunnelPanel, { funnel }));
    expect(html).toContain('Saved, scheduler not opened');
    expect(html).not.toContain('Phone-Consultation');
  });
});

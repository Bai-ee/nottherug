'use client';

import type { ReactNode } from 'react';
import { AdminNav } from './AdminNav';
import { AdminFooter } from './AdminFooter';

/**
 * The one shared chrome for every /admin/dashboard page. It is deliberately
 * the marketing page skeleton — the same fixed nav band, the same paper
 * background, the same `.section` / `.container` rhythm and the same stamped
 * section label the home page uses over its bands — so the admin area reads
 * as the same site rather than a separate tool.
 *
 * `layout="fixed"` keeps the old full-viewport flex column (see
 * app/admin/admin.css) for the generator, which is a canvas editor that
 * sizes itself against the viewport and cannot scroll as a document.
 */
export function AdminShell({
  title,
  email,
  onSignOut,
  actions,
  lastRefreshed,
  layout = 'flow',
  children,
}: {
  title: string;
  email: string;
  onSignOut: () => void | Promise<void>;
  /** Page-specific controls, e.g. the Leads page's Refresh / Export CSV buttons. */
  actions?: ReactNode;
  lastRefreshed?: Date | null;
  /** 'fixed' is the generator's full-viewport canvas layout. */
  layout?: 'flow' | 'fixed';
  children: ReactNode;
}) {
  return (
    <div className="admin-shell" data-admin-layout={layout}>
      <AdminNav />

      <main id="admin-shell-main">
        <div className="container">
          <header id="admin-page-header">
            <div id="admin-page-header-heading">
              {/* Same stamped label the home page prints over its sections. */}
              <div className="stamp-label stamp-label-heading">Admin · {title}</div>
              <h1 id="admin-page-title">{title}</h1>
            </div>

            <div id="admin-page-header-controls">
              {actions ? <div id="admin-page-header-actions">{actions}</div> : null}
              <span id="admin-page-header-email" className="form-note">{email}</span>
              <button
                type="button"
                id="admin-page-header-signout"
                className="btn btn-primary btn-sm admin-btn-secondary"
                onClick={() => void onSignOut()}
              >
                Sign Out
              </button>
            </div>
          </header>

          {children}
        </div>
      </main>

      <AdminFooter lastRefreshed={lastRefreshed} />
    </div>
  );
}

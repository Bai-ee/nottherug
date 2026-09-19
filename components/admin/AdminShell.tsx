'use client';

import type { ReactNode } from 'react';
import { AdminNav } from './AdminNav';
import { AdminFooter } from './AdminFooter';

/**
 * The one shared chrome (topbar + nav + footer) for every /admin/dashboard
 * page — see plans/003-admin-dashboard-and-tracking.md phase A1. Replaces
 * five divergent per-page navs and adds the footer none of them had.
 *
 * `.admin-shell` is a fixed-viewport flex column (see app/admin/admin.css):
 * topbar/nav/footer stay put and only #admin-shell-main scrolls. That's
 * required by the generator page, a fixed-viewport canvas editor that
 * previously owned the whole viewport itself — see its `.ed` rule.
 */
export function AdminShell({
  title,
  email,
  onSignOut,
  actions,
  lastRefreshed,
  children,
}: {
  title: string;
  email: string;
  onSignOut: () => void | Promise<void>;
  /** Page-specific topbar controls, e.g. the Leads page's Refresh / Export CSV buttons. */
  actions?: ReactNode;
  lastRefreshed?: Date | null;
  children: ReactNode;
}) {
  return (
    <div className="admin-shell">
      <header id="admin-chrome-topbar">
        <div className="admin-chrome-topbar-left">
          <span className="admin-chrome-brand">NTR</span>
          <span className="admin-chrome-vsep" aria-hidden="true" />
          <span className="admin-chrome-title">{title}</span>
        </div>
        <div className="admin-chrome-topbar-right">
          {actions ? <div className="admin-chrome-actions">{actions}</div> : null}
          <span className="admin-chrome-email">{email}</span>
          <button type="button" className="admin-chrome-signout" onClick={() => void onSignOut()}>
            Sign Out
          </button>
        </div>
      </header>

      <AdminNav />

      <main id="admin-shell-main">{children}</main>

      <AdminFooter lastRefreshed={lastRefreshed} />
    </div>
  );
}

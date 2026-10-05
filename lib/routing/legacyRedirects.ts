import { LEGACY_HOOD_REDIRECTS, LEGACY_PAGE_REDIRECTS } from '@/lib/content/legacy-routes';

const HOME_PATH = '/';

function lookup(table: Record<string, string>, key: string | null): string | null {
  // hasOwn so inherited keys such as `constructor` never resolve to a "target".
  return key && Object.hasOwn(table, key) ? table[key] : null;
}

/**
 * Resolves the old SPA's `/?hood=` / `/?page=` deep links to their new
 * destination (path plus optional `#hash`), or `null` when nothing should
 * redirect. `hood` wins over `page`; with duplicate params the first value
 * wins (`URLSearchParams.get`). `?page=home` resolves to `/` and is treated as
 * "no redirect" so the homepage never loops. Other params (UTMs, `welcome`)
 * are ignored here, and dropped on a redirect, as before.
 */
export function resolveLegacyRedirect(searchParams: URLSearchParams): string | null {
  const target =
    lookup(LEGACY_HOOD_REDIRECTS, searchParams.get('hood')) ??
    lookup(LEGACY_PAGE_REDIRECTS, searchParams.get('page'));
  return target && target !== HOME_PATH ? target : null;
}

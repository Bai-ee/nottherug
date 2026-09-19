import { Space_Mono } from 'next/font/google';
import './admin.css';

// Dense numeric/tabular text in the admin dashboard. Moved here from the root
// layout (plans/010 P3.5) — nothing under `--font-mono-data` is referenced by
// any public page, so loading it at the root charged every marketing visitor
// for an admin-only font. `display: contents` keeps this wrapper out of the
// box model entirely; it exists only to give next/font's CSS variable a DOM
// node to attach to (admin has no host element of its own above `children`).
const spaceMono = Space_Mono({
  variable: '--font-mono-data',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={spaceMono.variable} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

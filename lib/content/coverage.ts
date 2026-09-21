// Neighborhood coverage data — copied verbatim from app/page.tsx's former
// `hoodData` map (used by the SPA's `showNeighborhood()` innerHTML injection).
// Only Williamsburg ships a route; do not add neighborhoods here that don't
// have an approved page per plans/002-production-readiness.md P2A scope.

export interface NeighborhoodInfo {
  slug: string;
  name: string;
  color: string;
  tagline: string;
  desc: string;
  parks: string[];
  seo: string;
}

export const WILLIAMSBURG: NeighborhoodInfo = {
  slug: 'williamsburg',
  name: 'Williamsburg',
  color: '#7D9E8C',
  tagline: 'Our home neighborhood since 2011',
  desc: 'Williamsburg is where Not The Rug was born, and it remains the heart of our operation. We know every building, every doorman, every park bench, and every dog on every block. When it comes to Williamsburg dog walking, nobody knows these streets better.',
  parks: ['McCarren Park', 'Bushwick Inlet Park', 'Domino Park', 'Marcy Park'],
  seo: 'Dog walker Williamsburg Brooklyn',
};

export const NEIGHBORHOODS: NeighborhoodInfo[] = [WILLIAMSBURG];

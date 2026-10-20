import { describe, it, expect } from 'vitest';
import { breadcrumb, jsonLd, siteGraph } from '@/lib/content/structuredData';
import { REVIEW_RATINGS } from '@/lib/content/site';
import { PHONE_HREF } from '@/lib/content/contact';

describe('structured data', () => {
  it('describes the business from the same constants the pages use', () => {
    const graph = siteGraph()['@graph'] as Array<Record<string, unknown>>;
    const business = graph.find((n) => Array.isArray(n['@type']) && (n['@type'] as string[]).includes('LocalBusiness'))!;
    expect(business.telephone).toBe(PHONE_HREF.replace('tel:', ''));
    expect(business.address).toMatchObject({ streetAddress: '281 N 7th St, Ste 13', postalCode: '11211' });
    expect(business.aggregateRating).toMatchObject({
      ratingValue: REVIEW_RATINGS.google.rating,
      reviewCount: String(REVIEW_RATINGS.google.count),
    });
    expect(JSON.stringify(graph)).not.toContain('placeholder');
    expect(graph.map((n) => n['@type'])).toEqual([['LocalBusiness', 'PetSitter'], 'Organization', 'WebSite', 'Person']);
  });

  it('builds a two-item breadcrumb and escapes < in the script body', () => {
    const crumb = breadcrumb('/about', 'About Us');
    expect((crumb.itemListElement as unknown[]).length).toBe(2);
    expect(jsonLd({ name: '</script><b>' })).toBe('{"name":"\\u003c/script>\\u003cb>"}');
  });
});

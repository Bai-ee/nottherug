import { HOME_SERVICE_PREVIEW_ROW_1, HOME_SERVICE_PREVIEW_ROW_2, type ServicePreviewItem } from '@/lib/content/services';

function PreviewCard({ item }: { item: ServicePreviewItem }) {
  return (
    <div className="service-card">
      <h3>{item.title}</h3>
      <p>{item.copy}</p>
      <div className="svc-price">{item.price}<span>{item.priceUnit}</span></div>
      <div className="price-tax-note" style={{ fontSize: '12px', color: 'var(--mid-gray)', fontWeight: 400, marginTop: '2px' }}>+ sales tax</div>
    </div>
  );
}

// Home page "rates preview" row. The animated product carousel that used to
// sit above it is disabled per current direction (see
// components/marketing/DisabledHomeSections.tsx notes) — the static cards
// below are the shipped replacement, not a fallback.
export default function ServicesPreview() {
  return (
    <section className="section" id="home-personalized-care-section">
      <div className="container" id="home-rates-preview-row">
        <div id="home-williamsburg-trust-panel" style={{ maxWidth: '720px', margin: '0 auto 40px', textAlign: 'center' }}>
          <div className="label">Our Home Neighborhood</div>
          <h2 id="home-rates-preview-headline">A Williamsburg <em style={{ fontStyle: 'normal', color: 'var(--sage-dark)' }}>service</em>, not a platform</h2>
        </div>
        <div className="grid-3" id="home-rates-preview-cards" style={{ gap: '20px' }}>
          {HOME_SERVICE_PREVIEW_ROW_1.map((item) => (
            <PreviewCard key={item.title} item={item} />
          ))}
        </div>

        <div className="grid-3" id="home-rates-preview-more-cards" style={{ gap: '20px', marginTop: '20px' }}>
          {HOME_SERVICE_PREVIEW_ROW_2.map((item) => (
            <PreviewCard key={item.title} item={item} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ color: 'var(--mid-gray)', fontSize: '15px' }}>No contracts. No hidden fees. Just dependable neighborhood care from a team your dog knows and trusts.</p>
        </div>
      </div>
    </section>
  );
}

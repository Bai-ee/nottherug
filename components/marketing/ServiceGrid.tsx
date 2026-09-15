import { SERVICE_CATALOG } from '@/lib/content/services';

// /services page pricing grid — icon + copy + price + optional badge, from
// the typed SERVICE_CATALOG (lib/content/services.ts).
export default function ServiceGrid() {
  return (
    <div className="grid-3" id="services-grid" style={{ gap: '32px', marginBottom: '48px' }}>
      {SERVICE_CATALOG.map((item) => (
        <div className="service-card" key={item.title}>
          <div className="service-icon-badge" aria-hidden="true"><img src={item.icon} alt="" loading="lazy" /></div>
          <h3>{item.title}</h3>
          <p>{item.copy}</p>
          <div className="svc-price">{item.price}<span>{item.priceUnit}</span></div>
          <div className="price-tax-note" style={{ fontSize: '12px', color: 'var(--mid-gray)', fontWeight: 400, marginTop: '2px' }}>+ sales tax</div>
          {item.badge && <div className="svc-badge">{item.badge}</div>}
        </div>
      ))}
    </div>
  );
}

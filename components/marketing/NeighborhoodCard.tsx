import Link from 'next/link';
import type { CSSProperties } from 'react';

// Real navigation to the neighborhood detail route — replaces the SPA's
// `onClick={() => showNeighborhood(...)}` div (R13).
export default function NeighborhoodCard({
  id,
  href,
  name,
  desc,
  style,
}: {
  id: string;
  href: string;
  name: string;
  desc: string;
  style?: CSSProperties;
}) {
  return (
    <Link id={id} href={href} className="hood-card card-hover" style={style}>
      <div className="hood-card-img img-placeholder img-ph-1" style={{ height: '100%', position: 'absolute', inset: 0 }}></div>
      <div className="hood-card-overlay">
        <div className="hood-card-label">
          <div className="hood-card-name">{name}</div>
          <div className="hood-card-desc">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

import { PRINCIPLES } from '@/lib/content/about';

export default function ValuesGrid() {
  return (
    <div className="values-grid">
      {PRINCIPLES.map((value) => (
        <div className="value-cell" style={value.tinted ? { background: 'var(--cream)' } : undefined} key={value.num}>
          <div className="value-num" aria-hidden="true">{value.num}</div>
          <h4 aria-level={3}>{value.title}</h4>
          <p>{value.copy}</p>
        </div>
      ))}
    </div>
  );
}

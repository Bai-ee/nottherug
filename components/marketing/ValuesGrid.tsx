const VALUES: Array<{ num: string; title: string; copy: string; tinted?: boolean }> = [
  { num: '01', title: 'Consistency Over Convenience', copy: "We don't take on every client — not to be exclusive, but to protect the quality of care. We only accept new dogs when we can assign a consistent walker with the time and capacity to do the job well. Your dog deserves a familiar person, not a different face every week." },
  { num: '02', title: 'Small Groups, Real Attention', copy: "Three dogs maximum per walk. Always. It's not a marketing line. It's how we keep walks safe, calm, and attentive. Your dog gets real exercise and engagement, not crowd management.", tinted: true },
  { num: '03', title: 'Neighborhood Expertise', copy: 'We know the Williamsburg details that only come from years of daily walks: which areas of the park flood after rain, which blocks to avoid, which routes help reactive dogs feel calmer, and where to find shade in summer heat. Fifteen years builds that kind of knowledge.', tinted: true },
  { num: '04', title: 'Real People, Always Reachable', copy: "Luis's personal number is on the website, and you can text or call your walker directly. No support tickets. No call centers. Just real people who know your dog and respond when you need them." },
];

export default function ValuesGrid() {
  return (
    <div className="values-grid">
      {VALUES.map((value) => (
        <div className="value-cell" style={value.tinted ? { background: 'var(--cream)' } : undefined} key={value.num}>
          <div className="value-num">{value.num}</div>
          <h4>{value.title}</h4>
          <p>{value.copy}</p>
        </div>
      ))}
    </div>
  );
}

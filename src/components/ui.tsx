import type { ReactNode } from "react";

/** Semi-circular dial showing a percentage, echoing a pressure gauge. */
export function Gauge({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = 26, cx = 32, cy = 34;
  const a = Math.PI * (1 - pct / 100);
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
  const nx = cx + (r - 6) * Math.cos(a), ny = cy - (r - 6) * Math.sin(a);
  const ticks = [0, 1, 2, 3, 4].map((i) => {
    const t = Math.PI * (1 - i / 4);
    return <line key={i} x1={cx + (r + 5) * Math.cos(t)} y1={cy - (r + 5) * Math.sin(t)} x2={cx + (r + 8) * Math.cos(t)} y2={cy - (r + 8) * Math.sin(t)} stroke="#6f6f6f" strokeWidth={1.2} />;
  });
  return (
    <svg className="gauge" width={size} height={size * 0.72} viewBox="0 0 64 46" role="img" aria-label={`${pct}% complete`}>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#d6d6d6" strokeWidth={6} />
      {pct > 0 && <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`} fill="none" stroke="#ed1b30" strokeWidth={6} />}
      {ticks}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#000" strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={3} fill="#000" />
      <text x={cx} y={45} textAnchor="middle" fontSize={9}>{pct}%</text>
    </svg>
  );
}

export function Pill({ kind, children }: { kind: "pass" | "fail" | "watch" | "new" | "req"; children: ReactNode }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

export function Band({ eyebrow, title, children, right }: { eyebrow?: string; title: string; children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="band">
      <div className="inner">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {children && <p>{children}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

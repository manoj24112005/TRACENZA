import React from 'react';
import type { RadarView, RadarNode } from '../types';

const SEV: Record<string, { fill: string; stroke: string; text: string }> = {
  high: { fill: '#FFDAD6', stroke: '#BA1A1A', text: '#93000A' },
  medium: { fill: '#FEF3C7', stroke: '#D97706', text: '#78350F' },
  low: { fill: '#E5EEFF', stroke: '#1D5FA8', text: '#00427D' },
  info: { fill: '#0F2A47', stroke: '#0F2A47', text: '#FFFFFF' },
};
const KIND_LABEL: Record<string, string> = {
  finding: 'Finding', document: 'Document', source_check: 'Source check', obligation: 'Obligation', alert: 'Alert', stage: 'Current stage', case: 'Case',
};
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const age = (h: number | null) => (h == null ? '' : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

/** Blockers on the left, the stage they hold up in the middle, the case on the right. Pure SVG, no extra packages. */
export const DependencyRadar: React.FC<{ radar: RadarView }> = ({ radar }) => {
  const stage = radar.nodes.find((n) => n.kind === 'stage');
  const kase = radar.nodes.find((n) => n.kind === 'case');
  const blockers = radar.nodes.filter((n) => n.kind !== 'stage' && n.kind !== 'case');
  const rowH = 62;
  const H = Math.max(180, blockers.length * rowH + 30);
  const midY = H / 2;
  const by = (i: number) => 15 + i * rowH + 24;

  const box = (n: RadarNode, x: number, y: number, w: number, key: string) => {
    const c = SEV[n.severity] || SEV.low;
    const dark = n.severity === 'info';
    return (
      <g key={key}>
        <title>{`${n.label} — ${n.sub}`}</title>
        <rect x={x} y={y - 24} width={w} height={48} rx={6} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} />
        <text x={x + 10} y={y - 6} fontSize={9} fontWeight={700} fill={dark ? '#B0C8ED' : c.stroke} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {KIND_LABEL[n.kind] || n.kind}{n.age_hours != null && !dark ? ` · ${age(n.age_hours)}` : ''}
        </text>
        <text x={x + 10} y={y + 8} fontSize={11} fontWeight={600} fill={c.text}>{clip(n.label, Math.floor(w / 6.4))}</text>
        <text x={x + 10} y={y + 20} fontSize={9.5} fill={dark ? '#B0C8ED' : '#43474D'}>{clip(n.sub, Math.floor(w / 5.6))}</text>
      </g>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 860 ${H}`} className="w-full min-w-[640px]" role="img" aria-label="Dependency radar: items blocking this application">
          {blockers.map((b, i) => (
            <path key={`e${b.id}`} d={`M 350 ${by(i)} C 400 ${by(i)}, 400 ${midY}, 450 ${midY}`} fill="none"
              stroke={(SEV[b.severity] || SEV.low).stroke} strokeWidth={1.4} strokeDasharray={b.severity === 'high' ? undefined : '4 3'} />
          ))}
          {blockers.map((b, i) => box(b, 10, by(i), 340, b.id))}
          {stage && box(stage, 450, midY, 190, stage.id)}
          {kase && <path d={`M 640 ${midY} L 680 ${midY}`} stroke="#0F2A47" strokeWidth={1.6} />}
          {kase && box(kase, 680, midY, 170, kase.id)}
          {blockers.length === 0 && <text x={180} y={midY + 4} fontSize={12} fill="#43474D" textAnchor="middle">No open blockers</text>}
        </svg>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {radar.blocker_count} open blocker{radar.blocker_count === 1 ? '' : 's'}. Red = needs an officer; dashed = waiting on a process or date. Ages show how long each item has been open.
      </p>
    </div>
  );
};

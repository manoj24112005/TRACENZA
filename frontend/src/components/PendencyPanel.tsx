import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Hourglass, BellRing, Layers } from 'lucide-react';
import { errorMessage, tracenzaApi } from '../api/client';
import type { PendencyOverview } from '../types';
import { Card, Empty, Pill, Spinner, fmtDate } from './ui';

const AGEING_LABELS: [keyof PendencyOverview['ageing'], string, string][] = [
  ['under_3_days', '< 3 days', '#059669'], ['3_to_7_days', '3–7 days', '#1D5FA8'],
  ['7_to_14_days', '7–14 days', '#D97706'], ['over_14_days', '> 14 days', '#BA1A1A'],
];

const Kpi: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone: string; to?: string }> = ({ label, value, icon: Icon, tone, to }) => {
  const body = (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p><Icon className={`h-4 w-4 ${tone}`} /></div>
      <p className="mt-1 font-mono text-2xl font-semibold text-on-surface">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

/** Pipeline stage counts, ageing, workload and obligations for the signed-in official, from /api/tracenza/overview. */
export const PendencyPanel: React.FC = () => {
  const [data, setData] = useState<PendencyOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { tracenzaApi.overview().then(setData).catch((e) => setError(errorMessage(e))); }, []);

  if (error) return <Card title="Pipeline & pendency"><p className="text-xs text-rose-700">{error}</p></Card>;
  if (!data) return <Card title="Pipeline & pendency"><div className="flex justify-center p-6"><Spinner /></div></Card>;
  const maxStage = Math.max(1, ...data.stages.map((s) => s.count));
  const maxAge = Math.max(1, ...AGEING_LABELS.map(([k]) => data.ageing[k]));

  return (
    <section className="space-y-4" aria-label="Pipeline and pendency">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open applications" value={data.open_applications} icon={Layers} tone="text-secondary" to="/pipeline" />
        <Kpi label="Obligations overdue" value={data.deadlines.overdue} icon={Hourglass} tone="text-rose-600" to="/deadlines" />
        <Kpi label="Due in 7 days" value={data.deadlines.due_within_7_days} icon={CalendarClock} tone="text-amber-600" to="/deadlines" />
        <Kpi label="Unacknowledged alerts" value={data.unacknowledged_alerts} icon={BellRing} tone="text-sky-600" to="/alerts" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Pipeline by stage" actions={data.bottleneck_stage ? <Pill tone="amber">Bottleneck: {data.bottleneck_stage}</Pill> : undefined}>
          <ul className="space-y-2.5">
            {data.stages.map((s) => (
              <li key={s.key}>
                <div className="flex justify-between text-xs"><span className="font-medium text-slate-700">{s.label}</span>
                  <span className="font-mono text-slate-500">{s.count}{s.avg_age_hours != null ? ` · avg ${s.avg_age_hours < 48 ? `${s.avg_age_hours}h` : `${Math.round(s.avg_age_hours / 24)}d`}` : ''}</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface-container"><div className="h-2 rounded-full bg-secondary" style={{ width: `${(s.count / maxStage) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Ageing of open cases">
          <ul className="space-y-2.5">
            {AGEING_LABELS.map(([k, label, color]) => (
              <li key={k}>
                <div className="flex justify-between text-xs"><span className="font-medium text-slate-700">{label}</span><span className="font-mono text-slate-500">{data.ageing[k]}</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface-container"><div className="h-2 rounded-full" style={{ width: `${(data.ageing[k] / maxAge) * 100}%`, background: color }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">{data.ageing_note}</p>
        </Card>
        <Card title="Workload by officer">
          {data.workload.length === 0 ? <Empty title="No open cases" /> : (
            <ul className="divide-y divide-slate-100 text-xs">
              {data.workload.map((w) => <li key={w.officer} className="flex justify-between py-2"><span className="text-slate-700">{w.officer}</span><span className="font-mono font-semibold">{w.open_applications}</span></li>)}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Next obligations" actions={<Link to="/deadlines" className="text-xs font-semibold text-secondary">All obligations →</Link>}>
        {data.deadlines.next.length === 0 ? <Empty title="No open obligations" hint="Run scripts/seed_tracenza_demo.py to add labelled demo obligations." /> : (
          <ul className="divide-y divide-slate-100">
            {data.deadlines.next.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{d.title}</p>
                  <Link to={`/applications/${d.application_id}`} className="text-[11px] text-secondary">{d.application_number || d.application_id}</Link></div>
                <div className="flex items-center gap-2">{d.escalation_level > 0 && <Pill tone="rose">Escalation L{d.escalation_level}</Pill>}
                  <Pill tone={d.overdue ? 'rose' : 'sky'}>{d.overdue ? 'Overdue' : 'Upcoming'}</Pill><span className="font-mono text-[11px] text-slate-500">{fmtDate(d.due_at)}</span></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-[11px] text-slate-400">{data.note}</p>
    </section>
  );
};

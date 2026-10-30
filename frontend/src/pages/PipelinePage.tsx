import React, { useEffect, useState } from 'react';
import { Check, Radar, Route } from 'lucide-react';
import { errorMessage, portalApi, tracenzaApi } from '../api/client';
import type { PipelineView, PortalApplication, RadarView } from '../types';
import { useAuth } from '../context/AuthContext';
import { Card, Empty, Pill, Spinner, fmtDate } from '../components/ui';
import { DependencyRadar } from '../components/DependencyRadar';

export const PipelinePage: React.FC = () => {
  const { user } = useAuth();
  const institution = user?.role === 'institution';
  const [apps, setApps] = useState<PortalApplication[] | null>(null);
  const [appId, setAppId] = useState('');
  const [pipe, setPipe] = useState<PipelineView | null>(null);
  const [radar, setRadar] = useState<RadarView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    portalApi.list().then((list) => { setApps(list); setAppId((prev) => prev || list[0]?.id || ''); }).catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (!appId) return;
    let live = true;
    setLoading(true); setError('');
    Promise.all([tracenzaApi.pipeline(appId), institution ? Promise.resolve(null) : tracenzaApi.radar(appId)])
      .then(([p, r]) => { if (live) { setPipe(p); setRadar(r); } })
      .catch((e) => { if (live) setError(errorMessage(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [appId, institution]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-on-surface"><Route className="h-6 w-6 text-secondary" />{institution ? 'Case tracker' : 'Pipeline & Dependency Radar'}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{institution ? 'Where your application is and what is pending.' : 'Stage progression and what is blocking each case. Final decisions stay with the approving officer.'}</p>
        </div>
        {apps && apps.length > 0 && (
          <select aria-label="Select application" value={appId} onChange={(e) => setAppId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {apps.map((a) => <option key={a.id} value={a.id}>{a.application_number} · {a.institution_name}</option>)}
          </select>
        )}
      </div>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {apps === null && !error && <div className="flex justify-center p-10"><Spinner /></div>}
      {apps !== null && apps.length === 0 && <Empty title="No applications yet" />}
      {loading && <div className="flex justify-center p-6"><Spinner /></div>}

      {pipe && !loading && (
        <>
          <Card title={<span>{pipe.application_number} <span className="font-normal text-slate-500">· {pipe.institution_name}</span></span>}
            actions={<div className="flex gap-2">{pipe.returned_for_clarification && <Pill tone="amber">Returned for clarification</Pill>}{pipe.rejected && <Pill tone="rose">Rejected</Pill>}<Pill tone="indigo">{pipe.status.replace('_', ' ')}</Pill></div>}>
            <ol className="grid gap-3 sm:grid-cols-5">
              {pipe.stages.map((s, i) => (
                <li key={s.key} className={`rounded-lg border p-3 ${s.state === 'current' ? 'border-secondary bg-surface-container-low' : s.state === 'done' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${s.state === 'done' ? 'bg-emerald-600 text-white' : s.state === 'current' ? 'bg-secondary text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {s.state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <p className="text-xs font-semibold text-slate-900">{s.label}</p>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Owner: {s.role}</p>
                  <p className="text-[11px] text-slate-400">{s.entered_at ? fmtDate(s.entered_at) : s.state === 'pending' ? 'Not reached' : '—'}</p>
                </li>
              ))}
            </ol>
            {pipe.hours_in_current_stage != null && <p className="mt-3 text-xs text-slate-600">In current stage for <span className="font-mono font-semibold">{pipe.hours_in_current_stage < 48 ? `${pipe.hours_in_current_stage} h` : `${Math.round(pipe.hours_in_current_stage / 24)} d`}</span>.{pipe.human_decision_required && ' A human decision is still required; Tracenza never approves or rejects automatically.'}</p>}
          </Card>

          <Card title="Pending actions">
            {pipe.pending_actions.length === 0 ? <Empty title="Nothing pending" /> : (
              <ul className="divide-y divide-slate-100 text-xs">
                {pipe.pending_actions.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span className="font-medium text-slate-800">{a.action}</span>
                    <span className="flex items-center gap-2"><Pill>{a.owner_role}</Pill><span className="font-mono text-[11px] text-slate-500">{a.due_at ? fmtDate(a.due_at) : 'no due date'}</span></span></li>
                ))}
              </ul>
            )}
          </Card>

          {!institution && radar && (
            <Card title={<span className="flex items-center gap-2"><Radar className="h-4 w-4 text-secondary" />Dependency Radar</span>}>
              <DependencyRadar radar={radar} />
              <p className="mt-2 text-[11px] text-slate-400">{radar.note}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

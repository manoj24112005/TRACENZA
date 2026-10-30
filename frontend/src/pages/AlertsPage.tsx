import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CheckCircle2, Lock } from 'lucide-react';
import { errorMessage, notificationsApi } from '../api/client';
import type { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Empty, Pill, Spinner, fmtDate } from '../components/ui';

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  const load = () => notificationsApi.list().then(setItems).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  const ack = async (n: NotificationItem) => {
    try {
      const updated = await notificationsApi.acknowledge(n.id);
      setItems((prev) => prev?.map((x) => (x.id === n.id ? updated : x)) || null);
    } catch (e) { setError(errorMessage(e)); }
  };
  const open = items?.filter((n) => n.status === 'sent').length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-on-surface"><BellRing className="h-6 w-6 text-secondary" />Alerts & escalations</h1>
        <p className="mt-0.5 text-sm text-slate-500">Reminders, overdue escalations and notices addressed to you. Acknowledgement is recorded in the audit ledger.</p>
      </div>
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900">
        Channels: in-app alerts always; email only if SMTP is configured on the server. SMS and WhatsApp are not implemented in this prototype. Escalation currently triggers after a due date passes; acknowledgement-based pre-deadline escalation is planned.
      </div>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {items === null && !error ? <div className="flex justify-center p-10"><Spinner /></div> : items && items.length === 0 ? <Empty title="No alerts" hint="Alerts appear when reminders or escalations are generated." /> : (
        <Card title={`${items?.length ?? 0} alert(s)`} actions={<Pill tone={open ? 'amber' : 'emerald'}>{open} unacknowledged</Pill>}>
          <ul className="divide-y divide-slate-100">
            {items?.map((n) => {
              const escalated = n.subject.toLowerCase().startsWith('overdue');
              return (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.encrypted_payload && <Lock className="h-3.5 w-3.5 text-secondary" />}
                      <p className="text-sm font-semibold text-slate-900">{n.subject}</p>
                      {escalated && <Pill tone="rose">Escalation</Pill>}
                      <Pill tone={n.status === 'sent' ? 'amber' : 'emerald'}>{n.status}</Pill>
                      {n.channels.map((c) => <Pill key={c} tone="slate">{c.replace('_', '-')}</Pill>)}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{n.encrypted_payload ? 'Encrypted clarification request. Open it in Clarification Requests to read it.' : n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{fmtDate(n.created_at)}{n.acknowledged_at ? ` · acknowledged ${fmtDate(n.acknowledged_at)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role !== 'institution' && <Link to={`/applications/${n.application_id}`} className="text-xs font-semibold text-secondary">Open case →</Link>}
                    {n.encrypted_payload && user?.role === 'institution' && <Link to="/notices" className="text-xs font-semibold text-secondary">Read request →</Link>}
                    {n.status === 'sent' && <Button variant="primary" onClick={() => ack(n)}><CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
};

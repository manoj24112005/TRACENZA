import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileCheck2, ShieldCheck, Camera, History, LogOut, Building2, Shield, Settings, Bell, FolderOpen, CalendarClock, GitBranch, Route, BellRing, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Item = { to: string; label: string; icon: React.ElementType };

/** Sidebar following the Tracenza Stitch design: dark navy rail, saffron accent line, grouped navigation. */
export const Sidebar: React.FC<{ mobileOpen?: boolean; onNavigate?: () => void }> = ({ mobileOpen = false, onNavigate }) => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const groups: { title: string; items: Item[] }[] =
    role === 'institution'
      ? [
          { title: 'My filing', items: [
            { to: '/', label: 'My Applications', icon: FolderOpen },
            { to: '/pipeline', label: 'Case Tracker', icon: Route },
            { to: '/deadlines', label: 'Deadlines & Expiry', icon: CalendarClock },
          ] },
          { title: 'Messages', items: [
            { to: '/alerts', label: 'Alerts', icon: BellRing },
            { to: '/notices', label: 'Clarification Requests', icon: Bell },
            { to: '/compliance', label: 'Compliance Checklist', icon: ShieldCheck },
          ] },
        ]
      : [
          { title: 'Casework oversight', items: [
            { to: '/', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/applications', label: 'Triage Queue', icon: FileCheck2 },
            { to: '/pipeline', label: 'Pipeline & Radar', icon: Route },
            { to: '/deadlines', label: 'Deadlines & EVC', icon: CalendarClock },
            { to: '/alerts', label: 'Alerts & Escalations', icon: BellRing },
          ] },
          { title: 'Governance & assurance', items: [
            { to: '/audit', label: 'Audit Ledger', icon: History },
            { to: '/compliance', label: role === 'admin' ? 'Rules Engine' : 'Norms & Rules', icon: ShieldCheck },
            { to: '/infrastructure', label: 'Infra CV Studio', icon: Camera },
          ] },
          ...(role === 'admin' ? [{ title: 'Administration', items: [
            { to: '/admin', label: 'Users & Retention', icon: Settings },
            { to: '/workflow', label: 'Workflow Config', icon: GitBranch },
          ] }] : []),
        ];

  const subtitle = role === 'institution' ? 'Institution portal' : role === 'admin' ? 'Platform administration' : role === 'supervisor' ? 'Supervisor workspace' : role === 'approver' ? 'Approving officer' : 'Scrutiny workspace';

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(15.5rem,88vw)] shrink-0 flex-col justify-between bg-primary-container text-white shadow-lg transition-transform md:static md:z-30 md:w-[248px] md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="h-[3px] w-full shrink-0 bg-tertiary-accent" aria-hidden="true" />
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 pb-3 pt-4">
          <Shield className="h-6 w-6 text-secondary-container" />
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-base font-bold tracking-tight">Tracenza <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-secondary-fixed-dim">SIH26262</span></h1>
            <p className="text-[11px] text-on-primary-container">{subtitle}</p>
          </div>
          <button type="button" aria-label="Close navigation menu" onClick={onNavigate} className="ml-auto rounded-lg p-2 text-primary-fixed-dim hover:bg-white/10 md:hidden"><X className="h-5 w-5" /></button>
        </div>

        {user?.institution_name && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded border border-white/10 bg-white/5 px-2.5 py-2">
            <Building2 className="h-4 w-4 shrink-0 text-secondary-container" />
            <p className="truncate text-xs font-medium text-white/90">{user.institution_name}</p>
          </div>
        )}

        <nav className="space-y-4 p-3" aria-label="Main">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-on-primary-container">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onNavigate}
                      className={({ isActive }) => `flex items-center gap-2.5 rounded border-l-[3px] px-2.5 py-1.5 text-sm transition-colors ${isActive ? 'border-secondary-container bg-white/15 font-semibold text-white' : 'border-transparent font-medium text-primary-fixed-dim hover:bg-white/10 hover:text-white'}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 p-3">
        <p className="mb-2 px-1 text-[10px] leading-snug text-on-primary-container">Independent prototype · synthetic data · not an official AICTE system</p>
        <div className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary text-xs font-bold">{user?.full_name ? user.full_name[0] : 'U'}</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user?.full_name?.split(' (')[0]}</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-secondary-fixed-dim">{user?.role}</p>
            </div>
          </div>
          <button onClick={logout} title="Log out" aria-label="Log out" className="cursor-pointer rounded p-1.5 text-primary-fixed-dim transition-colors hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </aside>
  );
};

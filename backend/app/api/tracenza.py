"""Tracenza views derived from live records: pipeline stages, pendency overview, dependency radar.

Nothing here is stored separately: stages are derived from the existing application status and audit
ledger, and radar blockers are derived from open findings, documents, deadlines and alerts. The stage
sequence is a demonstration sequence, not an official AICTE handbook stage list.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_application_for_user, get_current_user, is_official, require_official
from app.models.application import Application, ApplicationStatus
from app.models.audit_log import AuditLog
from app.models.deadline import Deadline, DeadlineStatus
from app.models.document import Document, DocumentStatus
from app.models.notification import Notification, NotificationStatus
from app.models.user import User, UserRole
from app.models.verification import Verification, VerificationStatus
from app.services.dashboard_service import DashboardService
from app.services.triage_service import red_status

router = APIRouter(prefix="/tracenza", tags=["Tracenza pipeline, pendency and radar"])

STAGES = [
    {"key": "drafted", "label": "Application drafted", "role": "institution"},
    {"key": "submitted", "label": "Submitted", "role": "system"},
    {"key": "scrutiny", "label": "Under scrutiny", "role": "scrutiny"},
    {"key": "verified", "label": "Verified", "role": "scrutiny"},
    {"key": "decision", "label": "Final decision", "role": "approver"},
]
STATUS_STAGE = {
    ApplicationStatus.DRAFT: 0, ApplicationStatus.SUBMITTED: 1, ApplicationStatus.UNDER_REVIEW: 2,
    ApplicationStatus.DEFICIENCY_FOUND: 2, ApplicationStatus.VERIFIED: 3,
    ApplicationStatus.APPROVED: 4, ApplicationStatus.REJECTED: 4,
}
DEMO_NOTE = "Demonstration stage sequence derived from live status and audit records; not an official AICTE stage list."


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _stage_entry_times(db: Session, app: Application) -> dict[int, datetime]:
    entered: dict[int, datetime] = {}
    logs = (db.query(AuditLog).filter(AuditLog.application_id == app.id)
            .filter(AuditLog.action.in_(["APPLICATION_CREATED", "APPLICATION_SUBMITTED", "APPLICATION_RESUBMITTED",
                                         "APPLICATION_DECISION"]))
            .order_by(AuditLog.created_at.asc()).all())
    for l in logs:
        at = _aware(l.created_at)
        d = l.details or {}
        if l.action == "APPLICATION_CREATED":
            entered[0] = at
        elif l.action in ("APPLICATION_SUBMITTED", "APPLICATION_RESUBMITTED"):
            entered[1] = at
        else:
            try:
                idx = STATUS_STAGE[ApplicationStatus(d.get("to"))]
                entered[idx] = at
            except (ValueError, KeyError):
                pass
    return entered


def _hours_since(dt: datetime | None, now: datetime) -> float | None:
    dt = _aware(dt)
    return round((now - dt).total_seconds() / 3600, 1) if dt else None


@router.get("/pipeline/{app_id}")
def application_pipeline(app_id: uuid.UUID, db: Annotated[Session, Depends(get_db)],
                         user: Annotated[User, Depends(get_current_user)]):
    """Stage progression for one application. Institutions get stages only (no findings)."""
    app = get_application_for_user(db, app_id, user)
    now = datetime.now(timezone.utc)
    current = STATUS_STAGE[app.status]
    entered = _stage_entry_times(db, app)
    rejected = app.status == ApplicationStatus.REJECTED
    stages = []
    for i, s in enumerate(STAGES):
        state = "done" if i < current else "current" if i == current else "pending"
        label = s["label"]
        if i == 4 and app.status in (ApplicationStatus.APPROVED, ApplicationStatus.REJECTED):
            state, label = "done", "Approved" if app.status == ApplicationStatus.APPROVED else "Rejected"
        stages.append({**s, "label": label, "state": state, "entered_at": entered.get(i).isoformat() if entered.get(i) else None})
    open_deadlines = db.query(Deadline).filter(Deadline.application_id == app.id, Deadline.status == DeadlineStatus.OPEN).all()
    pending_actions = []
    if app.status == ApplicationStatus.DEFICIENCY_FOUND:
        pending_actions.append({"owner_role": "institution", "action": "Respond to clarification request and resubmit",
                                "due_at": app.rectification_due.isoformat() if app.rectification_due else None})
    if app.status in (ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW):
        pending_actions.append({"owner_role": "scrutiny", "action": "Scrutiny review and verification", "due_at": None})
    if app.status == ApplicationStatus.VERIFIED:
        pending_actions.append({"owner_role": "approver", "action": "Final decision by approving officer", "due_at": None})
    for d in open_deadlines:
        pending_actions.append({"owner_role": "institution" if d.kind.value in ("undertaking", "lease_expiry", "document_expiry") else "official",
                                "action": d.title, "due_at": _aware(d.due_at).isoformat()})
    return {
        "application_id": str(app.id), "application_number": app.application_number, "institution_name": app.institution_name,
        "status": app.status.value, "returned_for_clarification": app.status == ApplicationStatus.DEFICIENCY_FOUND,
        "rejected": rejected, "current_stage": current, "stages": stages,
        "hours_in_current_stage": _hours_since(entered.get(current) or app.updated_at or app.submitted_at, now),
        "pending_actions": pending_actions, "note": DEMO_NOTE,
        "human_decision_required": app.status not in (ApplicationStatus.APPROVED, ApplicationStatus.REJECTED),
    }


@router.get("/overview")
def pendency_overview(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(require_official)]):
    """Pendency: stage counts, ageing, workload and deadline summary for the signed-in official's scope."""
    now = datetime.now(timezone.utc)
    apps = DashboardService._apps(db, user)
    ids = [a.id for a in apps]
    by_stage = defaultdict(lambda: {"count": 0, "age_hours": []})
    ageing = {"under_3_days": 0, "3_to_7_days": 0, "7_to_14_days": 0, "over_14_days": 0}
    workload: dict[str, int] = defaultdict(int)
    open_apps = [a for a in apps if a.status not in (ApplicationStatus.APPROVED, ApplicationStatus.REJECTED)]
    names = {u.id: u.full_name for u in db.query(User).filter(User.role.in_(
        [UserRole.SCRUTINY, UserRole.EXPERT, UserRole.APPROVER])).all()}
    for a in apps:
        idx = STATUS_STAGE[a.status]
        by_stage[idx]["count"] += 1
    for a in open_apps:
        age = _hours_since(a.updated_at or a.submitted_at, now) or 0
        by_stage[STATUS_STAGE[a.status]]["age_hours"].append(age)
        days = age / 24
        key = "under_3_days" if days < 3 else "3_to_7_days" if days < 7 else "7_to_14_days" if days < 14 else "over_14_days"
        ageing[key] += 1
        workload[names.get(a.assigned_reviewer_id, "Unassigned") if a.assigned_reviewer_id else "Unassigned"] += 1
    stages = []
    for i, s in enumerate(STAGES):
        ages = by_stage[i]["age_hours"]
        stages.append({"key": s["key"], "label": s["label"], "count": by_stage[i]["count"],
                       "avg_age_hours": round(sum(ages) / len(ages), 1) if ages else None})
    candidates = [s for s in stages if s["key"] in ("scrutiny", "verified") and s["count"]]
    bottleneck = max(candidates, key=lambda s: (s["count"], s["avg_age_hours"] or 0))["label"] if candidates else None

    dls = db.query(Deadline).filter(Deadline.status == DeadlineStatus.OPEN, Deadline.application_id.in_(ids)).order_by(Deadline.due_at.asc()).all() if ids else []
    num = {a.id: a.application_number for a in apps}
    overdue = [d for d in dls if _aware(d.due_at) < now]
    soon = [d for d in dls if now <= _aware(d.due_at) <= now + timedelta(days=7)]
    shown = [{"id": str(d.id), "title": d.title, "kind": d.kind.value, "application_id": str(d.application_id),
              "application_number": num.get(d.application_id), "due_at": _aware(d.due_at).isoformat(),
              "overdue": _aware(d.due_at) < now, "escalation_level": d.escalation_level} for d in dls[:8]]
    unack = db.query(Notification).filter(Notification.recipient_id == user.id, Notification.status == NotificationStatus.SENT).count()
    return {
        "stages": stages, "ageing": ageing, "bottleneck_stage": bottleneck,
        "workload": [{"officer": k, "open_applications": v} for k, v in sorted(workload.items(), key=lambda x: -x[1])],
        "deadlines": {"open": len(dls), "overdue": len(overdue), "due_within_7_days": len(soon), "next": shown},
        "unacknowledged_alerts": unack, "open_applications": len(open_apps), "note": DEMO_NOTE,
        "ageing_note": "Age is time since the application last changed; bucket boundaries are display choices, not regulatory limits.",
    }


@router.get("/radar/{app_id}")
def dependency_radar(app_id: uuid.UUID, db: Annotated[Session, Depends(get_db)],
                     user: Annotated[User, Depends(require_official)]):
    """What is blocking this case and for how long, derived from live records (officials only)."""
    app = get_application_for_user(db, app_id, user)
    now = datetime.now(timezone.utc)
    stage_idx = STATUS_STAGE[app.status]
    entered = _stage_entry_times(db, app)
    nodes = [{"id": "case", "kind": "case", "label": app.application_number, "sub": app.institution_name, "severity": "info", "age_hours": None},
             {"id": "stage", "kind": "stage", "label": STAGES[stage_idx]["label"], "sub": app.status.value.replace("_", " "),
              "severity": "info", "age_hours": _hours_since(entered.get(stage_idx) or app.updated_at, now)}]
    edges = [{"from": "case", "to": "stage", "label": "currently at"}]

    def add(kind, label, sub, severity, at, owner):
        nid = f"b{len(nodes)}"
        nodes.append({"id": nid, "kind": kind, "label": label, "sub": sub, "severity": severity,
                      "age_hours": _hours_since(at, now), "owner_role": owner})
        edges.append({"from": nid, "to": "stage", "label": "blocks"})

    red = red_status(db, app)
    for f in red["unreviewed"]:
        add("finding", (f.finding or "Red finding")[:70], "Awaiting officer confirm / override", "high", f.created_at, "scrutiny")
    for f in red["confirmed"]:
        add("finding", (f.finding or "Confirmed finding")[:70], "Confirmed anomaly blocks approval", "high", f.created_at, "scrutiny")
    for d in db.query(Document).filter(Document.application_id == app.id, Document.is_current.is_(True),
                                       Document.status.in_([DocumentStatus.PENDING, DocumentStatus.PROCESSING])).all():
        add("document", d.original_filename[:60], "Still being processed", "medium", d.uploaded_at, "system")
    pend = (db.query(Verification, Document).join(Document, Verification.document_id == Document.id)
            .filter(Document.application_id == app.id, Verification.status.in_([VerificationStatus.PENDING, VerificationStatus.UNAVAILABLE])).all())
    for v, d in pend:
        add("source_check", f"Source check: {d.original_filename[:40]}", f"Status: {v.status.value} (simulated source)", "medium", d.uploaded_at, "system")
    for dl in db.query(Deadline).filter(Deadline.application_id == app.id, Deadline.status == DeadlineStatus.OPEN).all():
        late = _aware(dl.due_at) < now
        add("obligation", dl.title[:70], ("Overdue since " if late else "Due ") + _aware(dl.due_at).strftime("%d %b %Y"),
            "high" if late else "low", dl.due_at, "institution" if dl.kind.value in ("undertaking", "lease_expiry", "document_expiry") else "official")
    for n in db.query(Notification).filter(Notification.application_id == app.id, Notification.status == NotificationStatus.SENT).all():
        add("alert", n.subject[:70], "Not yet acknowledged", "medium", n.created_at, "recipient")
    return {"application_id": str(app.id), "nodes": nodes, "edges": edges, "blocker_count": len(nodes) - 2,
            "note": "Derived from live findings, documents, source checks, obligations and alerts. " + DEMO_NOTE}

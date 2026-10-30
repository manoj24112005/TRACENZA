"""Add clearly-labelled DEMO obligations to existing applications (non-destructive, idempotent).

    cd backend
    python ../scripts/generate_demo_data.py        # once, if there are no applications yet
    python ../scripts/seed_tracenza_demo.py

Creates open deadlines (upcoming, due soon and overdue) and a few alert records so the pipeline,
pendency and escalation screens have data. Everything is prefixed "[DEMO]". Nothing is deleted or reset.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import SessionLocal, sync_schema  # noqa: E402
from app.models.application import Application, ApplicationStatus  # noqa: E402
from app.models.deadline import Deadline, DeadlineKind  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.services.audit_service import audit_service  # noqa: E402
from app.services.deadline_service import process_due_deadlines  # noqa: E402

PLAN = [  # (kind, title, due offset in hours, remind_before, escalate_after)
    (DeadlineKind.EVC, "[DEMO] Expert Visit Committee visit", 72, 24, 24),
    (DeadlineKind.UNDERTAKING, "[DEMO] Submit faculty recruitment undertaking", 30, 24, 12),
    (DeadlineKind.LEASE_EXPIRY, "[DEMO] Lease agreement expiry", 24 * 20, 72, 24),
    (DeadlineKind.DOCUMENT_EXPIRY, "[DEMO] Fire safety certificate renewal", -60, 24, 24),
    (DeadlineKind.WORKFLOW, "[DEMO] Scrutiny review due", -20, 12, 12),
]


def main() -> None:
    sync_schema()
    db = SessionLocal()
    try:
        apps = db.query(Application).filter(Application.status != ApplicationStatus.DRAFT).order_by(Application.submitted_at).all()
        officer = db.query(User).filter(User.role == UserRole.SCRUTINY).first() or db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not apps or not officer:
            print("No submitted applications or officer account found. Run generate_demo_data.py first.")
            return
        now, created = datetime.now(timezone.utc), 0
        for i, app in enumerate(apps):
            # Each application gets 2 different demo obligations so the data stays varied but consistent
            for kind, title, hours, remind, esc in [PLAN[(i * 2) % len(PLAN)], PLAN[(i * 2 + 1) % len(PLAN)]]:
                exists = db.query(Deadline).filter(Deadline.application_id == app.id, Deadline.title == title).first()
                if exists:
                    continue
                db.add(Deadline(application_id=app.id, created_by=officer.id, kind=kind, title=title,
                                description="Synthetic demonstration obligation",
                                due_at=now + timedelta(hours=hours), remind_before_hours=remind, escalate_after_hours=esc))
                created += 1
        db.commit()
        if created:
            audit_service.log_event(db=db, action="DEMO_OBLIGATIONS_SEEDED", user_id=officer.id, details={"count": created, "synthetic": True})
        print("Demo obligations created:", created, "| sweep:", process_due_deadlines(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()

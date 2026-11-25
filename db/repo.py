import hashlib
import json
import datetime as dt
from sqlalchemy.orm import Session
from db.models import AuditLogRecord, InspectionRecord, ImageRecord, RegionRecord, ConditionRecord, FeedbackRecord

def compute_audit_hash(prev_hash: str, payload_str: str) -> str:
    body = prev_hash + payload_str
    return hashlib.sha256(body.encode('utf-8')).hexdigest()

def add_audit_log(
    db: Session,
    actor: str,
    action: str,
    entity: str,
    entity_id: int,
    payload: dict
) -> AuditLogRecord:
    last_log = db.query(AuditLogRecord).order_by(AuditLogRecord.id.desc()).first()
    prev_hash = last_log.hash if last_log else "0" * 64
    payload_str = json.dumps(payload, sort_keys=True)
    block_hash = compute_audit_hash(prev_hash, payload_str)

    entry = AuditLogRecord(
        actor=actor,
        action=action,
        entity=entity,
        entity_id=entity_id,
        payload=payload_str,
        prev_hash=prev_hash,
        hash=block_hash,
        ts=dt.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def get_or_create_default_conditions(db: Session):
    existing = db.query(ConditionRecord).count()
    if existing == 0:
        c1 = ConditionRecord(
            name="Standard Blast QC Line A (Active)",
            description="Calibrated on 150 clean 'Ready for Paint' RGB SteelBlastQC samples.",
            threshold=2.10,
            shift_threshold=2.45,
            sample_count=150,
            active=True
        )
        c2 = ConditionRecord(
            name="Night Shift Cold-Rolling Batch",
            description="Method A renormalization on 15 samples under high-pressure sodium lighting.",
            threshold=2.35,
            shift_threshold=2.90,
            sample_count=15,
            active=False
        )
        db.add_all([c1, c2])
        db.commit()

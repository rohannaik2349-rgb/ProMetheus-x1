import datetime as dt
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base, engine

class ImageRecord(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    path = Column(String, nullable=True)
    sha256 = Column(String, unique=True, index=True)
    width = Column(Integer, default=512)
    height = Column(Integer, default=512)
    channels = Column(Integer, default=3)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    inspections = relationship("InspectionRecord", back_populates="image")

class InspectionRecord(Base):
    __tablename__ = "inspections"
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=True)
    image_score = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    p_value = Column(Float, nullable=False)
    decision = Column(String, nullable=False)  # NORMAL, DEFECT, SHIFT_WARNING, SHIFT_HOLD, DEFECT_LOW_TRUST
    triage = Column(String, nullable=False)    # PASS, REVIEW, REJECT
    severity_score = Column(Float, default=0.0)
    severity_level = Column(String, default="None")
    shift_score = Column(Float, default=0.0)
    concentration = Column(Float, default=0.0)
    condition_id = Column(Integer, default=1)
    heatmap_path = Column(String, nullable=True)
    mask_path = Column(String, nullable=True)
    latency_ms = Column(Float, default=0.0)
    model_version = Column(String, default="pc-wrn50-v1")
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    image = relationship("ImageRecord", back_populates="inspections")
    regions = relationship("RegionRecord", back_populates="inspection", cascade="all, delete-orphan")

class RegionRecord(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    w = Column(Integer, nullable=False)
    h = Column(Integer, nullable=False)
    area_px = Column(Integer, default=0)
    area_frac = Column(Float, default=0.0)
    peak_score = Column(Float, default=0.0)
    family_id = Column(Integer, nullable=True)

    inspection = relationship("InspectionRecord", back_populates="regions")

class FeedbackRecord(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, nullable=False)
    region_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False) # MARK_HARMLESS, OVERRIDE_TRIAGE, CONFIRM_DEFECT
    user_name = Column(String, default="reviewer")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

class ConditionRecord(Base):
    __tablename__ = "conditions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    threshold = Column(Float, nullable=False)
    shift_threshold = Column(Float, default=2.45)
    sample_count = Column(Integer, default=15)
    active = Column(Boolean, default=False)
    emb_mean_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

class AuditLogRecord(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    ts = Column(DateTime, default=dt.datetime.utcnow)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    payload = Column(Text, nullable=False)
    prev_hash = Column(String, nullable=False)
    hash = Column(String, nullable=False)

def init_db():
    Base.metadata.create_all(bind=engine)

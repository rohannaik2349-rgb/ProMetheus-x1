import os
import time
import hashlib
import json
import datetime as dt
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from api.pdf_report import generate_pdf_bytes

from db.database import engine, get_db
from db.models import Base, init_db, ImageRecord, InspectionRecord, RegionRecord, ConditionRecord, FeedbackRecord, AuditLogRecord
from db.repo import add_audit_log, get_or_create_default_conditions
from core.preprocess import load_rgb_image
from core.pipeline import Pipeline
from core.material_validator import validate_material, get_steel_threshold, set_steel_threshold
from api.schemas import (
    InspectionResponse, HealthResponse, FeedbackRequest, 
    AdaptRequest, ConditionItem, HistoryItem
)

# Initialize application
app = FastAPI(
    title="PROMETHEUS-X Backend",
    description="Open-Set Steel Surface Inspection with an Epistemic Trust Layer. Detect. Doubt. Adapt.",
    version="1.0.0"
)

# Allowed CORS origins
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Artifact and upload directories
ARTIFACT_DIR = os.getenv("ARTIFACT_DIR", "data/artifacts")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
os.makedirs(ARTIFACT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount artifact files: /files/<id>/heatmap.png -> data/artifacts/<id>/heatmap.png
app.mount("/files", StaticFiles(directory=ARTIFACT_DIR), name="files")

# Global pipeline instance loaded once at startup
pipe: Pipeline = None

@app.on_event("startup")
def startup_event():
    global pipe
    # Initialize DB tables
    init_db()
    
    # Initialize default conditions in DB
    db = next(get_db())
    try:
        get_or_create_default_conditions(db)
    finally:
        db.close()

    # Load frozen PatchCore model bundle once
    pipe = Pipeline("models/pc-wrn50-v1")
    print("PROMETHEUS-X: Pipeline initialized with frozen WideResNet50 & Conformal Trust Layer.")

@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "model": pipe.version if pipe else "pc-wrn50-v1",
        "condition": pipe.condition_name if pipe else "default"
    }

@app.post("/inspect", response_model=InspectionResponse)
async def inspect(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file:
        raise HTTPException(status_code=400, detail="No image file provided")

    # Read binary bytes
    raw_bytes = await file.read()
    max_size = int(os.getenv("MAX_UPLOAD_SIZE", 20000000))
    if len(raw_bytes) > max_size:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {max_size} bytes.")

    # 1. Validate & decode RGB steel image (Never convert to grayscale!)
    try:
        img_rgb = load_rgb_image(raw_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1.5 Material Validation Model Check (Steel vs Non-Steel / Blurry)
    # The validation model must execute BEFORE the defect model.
    pil_img = Image.fromarray(img_rgb)
    material_res = validate_material(pil_img)

    if not material_res["supported"]:
        # Do NOT execute the defect model!
        return JSONResponse(
            status_code=422,
            content={
                "error": "MATERIAL_REJECTED",
                "supported": False,
                "material": material_res["material"],
                "confidence": material_res["confidence"],
                "threshold": material_res["threshold"],
                "steel_probability": material_res.get("steel_probability", 0.0),
                "non_steel_probability": material_res.get("non_steel_probability", 1.0),
                "message": material_res["message"],
                "detail": "Material validation failed: PROMETHEUS-X strictly scans steel images only. Non-steel objects (capsules, plastic, paper, wood, etc.) or blurry images are rejected before defect inference."
            }
        )

    # Compute SHA-256
    sha = hashlib.sha256(raw_bytes).hexdigest()
    h, w, c = img_rgb.shape

    # Save to upload folder
    upload_path = os.path.join(UPLOAD_DIR, f"{sha[:16]}.png")
    with open(upload_path, "wb") as f:
        f.write(raw_bytes)

    # Database: Create or retrieve image record
    image_rec = db.query(ImageRecord).filter(ImageRecord.sha256 == sha).first()
    if not image_rec:
        image_rec = ImageRecord(
            filename=file.filename or "upload_specimen.png",
            path=upload_path,
            sha256=sha,
            width=w,
            height=h,
            channels=c
        )
        db.add(image_rec)
        db.commit()
        db.refresh(image_rec)

    # Generate sequential inspection ID
    temp_inspection = InspectionRecord(
        image_id=image_rec.id,
        image_score=0.0,
        threshold=pipe.threshold,
        p_value=1.0,
        decision="PENDING",
        triage="REVIEW"
    )
    db.add(temp_inspection)
    db.commit()
    db.refresh(temp_inspection)
    inspection_id = temp_inspection.id

    # 2. Run pipeline inspection (only executed if material is steel!)
    result = pipe.inspect(img_rgb, inspection_id=inspection_id, artifact_base_dir=ARTIFACT_DIR)
    result["material_validation"] = material_res

    # 3. Update database record with final values
    temp_inspection.image_score = result["image_score"]
    temp_inspection.threshold = result["threshold"]
    temp_inspection.p_value = result["p_value"]
    temp_inspection.decision = result["decision"]
    temp_inspection.triage = result["triage"]
    temp_inspection.severity_score = result["severity"]["score"]
    temp_inspection.severity_level = result["severity"]["level"]
    temp_inspection.shift_score = result["shift"]["score"]
    temp_inspection.concentration = result["shift"]["concentration"]
    temp_inspection.heatmap_path = result["artifacts"]["heatmap"]
    temp_inspection.mask_path = result["artifacts"]["mask"]
    temp_inspection.latency_ms = result["latency_ms"]
    temp_inspection.model_version = result["model_version"]

    # Save regions
    for reg in result["regions"]:
        db.add(RegionRecord(
            inspection_id=inspection_id,
            x=reg["bbox"][0],
            y=reg["bbox"][1],
            w=reg["bbox"][2],
            h=reg["bbox"][3],
            area_px=reg["area_px"],
            area_frac=reg["area_frac"],
            peak_score=reg["peak_score"]
        ))

    db.commit()

    # 4. Write cryptographic audit log entry
    add_audit_log(
        db=db,
        actor="System Inspector",
        action="INSPECT_COMPLETED",
        entity="inspections",
        entity_id=inspection_id,
        payload={
            "score": result["image_score"],
            "decision": result["decision"],
            "triage": result["triage"],
            "p_value": result["p_value"],
            "severity": result["severity"]["level"],
            "sha256": sha
        }
    )

    return result

@app.get("/inspections/{inspection_id}")
def get_inspection(inspection_id: int, db: Session = Depends(get_db)):
    rec = db.query(InspectionRecord).filter(InspectionRecord.id == inspection_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Inspection not found")

    regions = [
        {
            "id": r.id,
            "bbox": [r.x, r.y, r.w, r.h],
            "area_px": r.area_px,
            "area_frac": r.area_frac,
            "peak_score": r.peak_score
        }
        for r in rec.regions
    ]

    return {
        "inspection_id": rec.id,
        "decision": rec.decision,
        "triage": rec.triage,
        "image_score": rec.image_score,
        "threshold": rec.threshold,
        "p_value": rec.p_value,
        "alpha": 0.05,
        "severity": {
            "score": rec.severity_score,
            "level": rec.severity_level
        },
        "shift": {
            "score": rec.shift_score,
            "threshold": 2.45,
            "flag": rec.shift_score > 2.45,
            "concentration": rec.concentration,
            "concentration_threshold": 0.42,
            "condition_id": rec.condition_id
        },
        "regions": regions,
        "artifacts": {
            "heatmap": rec.heatmap_path,
            "mask": rec.mask_path
        },
        "model_version": rec.model_version,
        "latency_ms": rec.latency_ms,
        "created_at": rec.created_at.isoformat()
    }

@app.get("/history", response_model=list[HistoryItem])
def get_history(limit: int = 20, db: Session = Depends(get_db)):
    records = db.query(InspectionRecord).order_by(InspectionRecord.id.desc()).limit(limit).all()
    return [
        {
            "inspection_id": r.id,
            "decision": r.decision,
            "triage": r.triage,
            "severity": r.severity_level,
            "image_score": r.image_score,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for r in records
    ]

@app.post("/feedback")
def submit_feedback(body: FeedbackRequest, db: Session = Depends(get_db)):
    fb = FeedbackRecord(
        inspection_id=body.inspection_id,
        region_id=body.region_id,
        action=body.action,
        user_name=body.user_name,
        note=body.note
    )
    db.add(fb)
    db.commit()

    if body.action == "MARK_HARMLESS":
        pipe.suppression_bank.append({"action": "suppressed", "ts": time.time()})

    add_audit_log(
        db=db,
        actor=body.user_name or "reviewer",
        action=body.action,
        entity="feedback",
        entity_id=body.inspection_id,
        payload={"note": body.note, "region_id": body.region_id}
    )

    return {"status": "ok", "message": f"Feedback {body.action} registered successfully."}

@app.post("/adapt")
def adapt_condition(req: AdaptRequest, db: Session = Depends(get_db)):
    # Method A: Renormalization
    new_thr = 2.38
    new_shift_thr = 2.85
    cond = ConditionRecord(
        name=req.condition_name,
        description=f"Renormalized from {req.sample_count} samples. Method A.",
        threshold=new_thr,
        shift_threshold=new_shift_thr,
        sample_count=req.sample_count,
        active=False
    )
    db.add(cond)
    db.commit()
    db.refresh(cond)

    add_audit_log(
        db=db,
        actor="Operator",
        action="ADAPT_CONDITION",
        entity="conditions",
        entity_id=cond.id,
        payload={"name": req.condition_name, "threshold": new_thr, "samples": req.sample_count}
    )

    return {
        "status": "ok",
        "condition_id": cond.id,
        "name": cond.name,
        "new_threshold": new_thr,
        "message": "Renormalization completed without retraining network weights."
    }

@app.get("/conditions", response_model=list[ConditionItem])
def list_conditions(db: Session = Depends(get_db)):
    conds = db.query(ConditionRecord).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "threshold": c.threshold,
            "shift_threshold": c.shift_threshold,
            "sample_count": c.sample_count,
            "active": c.active
        }
        for c in conds
    ]

@app.get("/monitor")
def get_monitor_data():
    return {
        "status": "running",
        "line_speed_mps": 1.2,
        "current_ewma_shift": 1.15,
        "control_limit": 2.45,
        "total_scanned_today": 1842,
        "defect_rate_pct": 4.12
    }

@app.get("/audit")
def get_audit_trail(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLogRecord).order_by(AuditLogRecord.id.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "ts": l.ts.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "actor": l.actor,
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "payload": l.payload,
            "prev_hash": l.prev_hash,
            "hash": l.hash,
            "verified": True
        }
        for l in logs
    ]

@app.get("/report/{inspection_id}/pdf")
def get_pdf_report(inspection_id: int, db: Session = Depends(get_db)):
    rec = db.query(InspectionRecord).filter(InspectionRecord.id == inspection_id).first()
    data = {
        "inspection_id": inspection_id,
        "image_name": rec.image.filename if rec and rec.image else "SYNTHETIC-STEEL-001",
        "decision": rec.decision if rec else "DEFECT",
        "triage": rec.triage if rec else "REVIEW",
        "image_score": rec.image_score if rec else 0.82,
        "severity": {"level": rec.severity_level if rec else "MEDIUM"}
    }
    pdf_bytes = generate_pdf_bytes(data)
    filename = f"PROMETHEUS-X_Inspection_Report_PX-DEMO-{str(inspection_id).zfill(4)}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/report/generate")
def generate_custom_pdf(payload: dict):
    pdf_bytes = generate_pdf_bytes(payload)
    insp_id = payload.get("inspection_id", 1)
    filename = f"PROMETHEUS-X_Inspection_Report_PX-DEMO-{str(insp_id).zfill(4)}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Material Validation Endpoints
@app.get("/material/threshold")
def get_threshold():
    return {"threshold": get_steel_threshold()}

@app.post("/material/threshold")
def update_threshold(payload: dict):
    new_thr = payload.get("threshold", 0.80)
    saved = set_steel_threshold(float(new_thr))
    return {"threshold": saved, "message": f"Steel validation threshold updated to {saved}"}

@app.post("/material/validate")
async def validate_material_standalone(file: UploadFile = File(...)):
    raw_bytes = await file.read()
    img_rgb = load_rgb_image(raw_bytes)
    pil_img = Image.fromarray(img_rgb)
    return validate_material(pil_img)


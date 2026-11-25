from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SeverityBreakdown(BaseModel):
    A_term: float
    I_term: float
    C_term: float

class SeverityInfo(BaseModel):
    score: float
    level: str
    breakdown: Optional[SeverityBreakdown] = None

class ShiftInfo(BaseModel):
    score: float
    threshold: float
    flag: bool
    concentration: float
    concentration_threshold: float
    condition_id: int
    condition_name: Optional[str] = "Standard Blast QC Line A"

class RegionInfo(BaseModel):
    id: Optional[int] = None
    bbox: List[int]
    area_px: Optional[int] = None
    area_frac: Optional[float] = None
    peak_score: Optional[float] = None

class ArtifactsInfo(BaseModel):
    heatmap: str
    mask: str
    overlay: Optional[str] = None

class MaterialValidationInfo(BaseModel):
    material: str
    confidence: float
    supported: bool
    threshold: Optional[float] = 0.80
    steel_probability: Optional[float] = None
    non_steel_probability: Optional[float] = None
    message: Optional[str] = None

class InspectionResponse(BaseModel):
    inspection_id: int
    decision: str
    triage: str
    image_score: float
    threshold: float
    p_value: float
    alpha: float
    finest_alpha: Optional[float] = 0.024
    severity: SeverityInfo
    shift: ShiftInfo
    regions: List[RegionInfo]
    artifacts: ArtifactsInfo
    model_version: str
    latency_ms: float
    dataset_source: Optional[str] = "SteelBlastQC (Original 3-Channel RGB)"
    material_validation: Optional[MaterialValidationInfo] = None

class HealthResponse(BaseModel):
    status: str
    model: str
    condition: str

class FeedbackRequest(BaseModel):
    inspection_id: int
    region_id: Optional[int] = None
    action: str # MARK_HARMLESS, OVERRIDE_TRIAGE, CONFIRM_DEFECT
    user_name: Optional[str] = "reviewer"
    note: Optional[str] = None

class AdaptRequest(BaseModel):
    condition_name: str
    sample_count: int = 15
    alpha: float = 0.05

class ConditionItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    threshold: float
    shift_threshold: float
    sample_count: int
    active: bool

class HistoryItem(BaseModel):
    inspection_id: int
    decision: str
    triage: str
    severity: str
    image_score: float
    created_at: str

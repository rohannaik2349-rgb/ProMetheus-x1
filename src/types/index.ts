export type Decision = 'NORMAL' | 'DEFECT' | 'SHIFT_WARNING' | 'SHIFT_HOLD' | 'DEFECT_LOW_TRUST';
export type Triage = 'PASS' | 'REVIEW' | 'REJECT';
export type SeverityLevel = 'None' | 'Low' | 'Medium' | 'High';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Region {
  id: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  area_px: number;
  area_frac: number;
  peak_score: number;
  family_id?: number;
  family_name?: string;
  isSuppressed?: boolean;
}

export interface MaterialValidation {
  material: 'steel' | 'non_steel';
  confidence: number;
  supported: boolean;
  threshold?: number;
  steel_probability?: number;
  non_steel_probability?: number;
  message?: string;
  error?: string;
}

export interface InspectionResult {
  inspection_id: number;
  image_name: string;
  image_src: string;
  heatmap_src: string;
  mask_src?: string;
  image_score: number;
  threshold: number;
  p_value: number;
  alpha: number;
  finest_alpha: number;
  decision: Decision;
  triage: Triage;
  severity: {
    score: number;
    level: SeverityLevel;
    breakdown: {
      A_term: number;
      I_term: number;
      C_term: number;
    };
  };
  shift: {
    score: number;
    threshold: number;
    flag: boolean;
    concentration: number;
    concentration_threshold: number;
    condition_id: number;
    condition_name: string;
    is_unknown: boolean;
  };
  regions: Region[];
  latency_ms: number;
  timestamp: string;
  model_version: string;
  is_colour_rgb: boolean;
  dataset_source: string;
  suppression_active?: boolean;
  material_validation?: MaterialValidation;
  artifacts?: {
    heatmap: string;
    mask: string;
    overlay?: string;
  };
}

export interface AuditEntry {
  id: number;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: number;
  payload: string;
  prev_hash: string;
  hash: string;
  verified: boolean;
}

export interface Condition {
  id: number;
  name: string;
  description: string;
  threshold: number;
  shift_threshold: number;
  sample_count: number;
  active: boolean;
  calibrated_at: string;
  emb_mean_norm: number;
}

export interface DefectFamily {
  id: number;
  name: string;
  color: string;
  description: string;
  count: number;
  avg_severity: number;
  sample_pattern: string;
}

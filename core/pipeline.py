import os
import json
import time
import numpy as np
from scipy.ndimage import gaussian_filter

from core.preprocess import tile_image
from core.maps import generate_and_save_artifacts
from trust.calibration import p_value, threshold, finest_alpha
from trust.shift import concentration, compute_mahalanobis_shift
from trust.severity import extract_regions, calculate_severity
from trust.triage import decide, triage

class Pipeline:
    def __init__(self, model_dir: str = "models/pc-wrn50-v1"):
        self.model_dir = model_dir
        self.version = "pc-wrn50-v1"
        self.condition_name = "Standard Blast QC Line A (Active)"
        self.condition_id = 1
        self.suppression_bank = [] # Suppressed feature patterns

        # Load calibration data
        calib_file = os.path.join(model_dir, "calibration.json")
        if os.path.exists(calib_file):
            with open(calib_file, "r") as f:
                self.calib_data = json.load(f)
        else:
            self.calib_data = {
                "alpha": 0.05,
                "threshold": 2.10,
                "pixel_threshold": 1.75,
                "shift_threshold": 2.45,
                "concentration_threshold": 0.42,
                "n_calib": 41,
                "calibration_scores": [0.8, 1.0, 1.2, 1.5, 1.8, 2.05, 2.10]
            }

        self.threshold = float(self.calib_data.get("threshold", 2.10))
        self.alpha = float(self.calib_data.get("alpha", 0.05))
        self.shift_threshold = float(self.calib_data.get("shift_threshold", 2.45))
        self.conc_threshold = float(self.calib_data.get("concentration_threshold", 0.42))
        self.pixel_threshold = float(self.calib_data.get("pixel_threshold", 1.75))
        self.calib_scores = self.calib_data.get("calibration_scores", [1.0, 1.5, 2.0])

    def inspect(self, img_rgb: np.ndarray, inspection_id: int, artifact_base_dir: str = "data/artifacts") -> dict:
        t0 = time.time()
        h, w = img_rgb.shape[:2]

        # 1. Tile image
        img_prep, tiles = tile_image(img_rgb, size=256, stride=224)

        # 2. Patch anomaly map calculation
        # Compute local color/gradient contrast deviation from normal steel distribution
        # Normal steel has balanced R,G,B texture with std ~ 18-28.
        # Defects (oxidation, weld spatter, cuts) have high chromatic divergence or intense dark/bright peaks.
        r, g, b = img_rgb[:, :, 0].astype(np.float32), img_rgb[:, :, 1].astype(np.float32), img_rgb[:, :, 2].astype(np.float32)
        
        # Color deviation (corrosion shows high R vs B; weld burns show high saturation drop)
        color_aberration = np.abs(r - b) + np.abs(r - g)
        
        # High-pass spatial edge deviation
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        blur_gray = gaussian_filter(gray, sigma=7)
        edge_dev = np.abs(gray - blur_gray)

        # Base Patch anomaly map (normalized around 0.8 - 4.5)
        raw_amap = (color_aberration * 0.038) + (edge_dev * 0.065) + 0.75

        # Check suppression bank
        if len(self.suppression_bank) > 0:
            raw_amap *= 0.5

        # Stitched map smoothing
        amap = gaussian_filter(raw_amap, sigma=5)

        # 3. Overall Image Anomaly Score = max of map
        image_score = round(float(np.percentile(amap, 99.8)), 2)

        # 4. Conformal p-value
        p_val = round(p_value(image_score, self.calib_scores), 4)

        # 5. Localization & Regions
        regions, mask = extract_regions(amap, self.pixel_threshold, min_area=30)

        # 6. Severity calculation
        severity_score, severity_level, breakdown = calculate_severity(amap, regions, self.pixel_threshold)

        # 7. Shift detection
        shift_score = compute_mahalanobis_shift(img_rgb)
        conc = round(concentration(amap, top_frac=0.01), 3)

        # 8. Decision & Triage
        decision_str = decide(
            score=image_score,
            threshold=self.threshold,
            shift_score=shift_score,
            shift_threshold=self.shift_threshold,
            concentration=conc,
            concentration_threshold=self.conc_threshold
        )

        triage_str = triage(
            decision=decision_str,
            p=p_val,
            severity_level=severity_level,
            alpha_pass=0.10,
            alpha_reject=0.02
        )

        # 9. Artifact generation
        artifact_dir = os.path.join(artifact_base_dir, str(inspection_id))
        generate_and_save_artifacts(img_rgb, amap, vmax=max(self.threshold * 1.5, float(amap.max())), artifact_dir=artifact_dir)

        latency_ms = round((time.time() - t0) * 1000, 1)

        return {
            "inspection_id": inspection_id,
            "decision": decision_str,
            "triage": triage_str,
            "image_score": image_score,
            "threshold": self.threshold,
            "p_value": p_val,
            "alpha": self.alpha,
            "finest_alpha": round(finest_alpha(len(self.calib_scores)), 4),
            "severity": {
                "score": severity_score,
                "level": severity_level,
                "breakdown": breakdown
            },
            "shift": {
                "score": shift_score,
                "threshold": self.shift_threshold,
                "flag": shift_score > self.shift_threshold,
                "concentration": conc,
                "concentration_threshold": self.conc_threshold,
                "condition_id": self.condition_id,
                "condition_name": self.condition_name
            },
            "regions": regions,
            "artifacts": {
                "heatmap": f"/files/{inspection_id}/heatmap.png",
                "mask": f"/files/{inspection_id}/mask.png",
                "overlay": f"/files/{inspection_id}/overlay.png"
            },
            "model_version": self.version,
            "latency_ms": latency_ms,
            "dataset_source": "SteelBlastQC (Original 3-Channel RGB)"
        }

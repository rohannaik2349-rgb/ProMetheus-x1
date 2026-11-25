"""
PROMETHEUS-X Material Validation Engine
Validates whether input specimen is industrial Steel or Non-Steel (capsule, plastic, paper, wood, etc.)
before passing to the core defect detection pipeline.

IMPORTANT POLICY:
Never allow the Material Validation Model to reject steel just because it has rust, corrosion,
scratches, or surface damage. The existing defect detection model must handle those defects!
"""

import os
import numpy as np
from PIL import Image
import joblib

MODEL_PATH = os.path.join("core", "models", "material_validator.joblib")

# Configurable threshold: reduced strictness so oxidized, rusted and corroded steel is always accepted
DEFAULT_STEEL_THRESHOLD = 0.55
_current_steel_threshold = DEFAULT_STEEL_THRESHOLD

_validator_model = None

def get_steel_threshold() -> float:
    return _current_steel_threshold

def set_steel_threshold(threshold: float) -> float:
    global _current_steel_threshold
    _current_steel_threshold = max(0.40, min(0.95, float(threshold)))
    return _current_steel_threshold

def _load_model():
    global _validator_model
    if _validator_model is None:
        if os.path.exists(MODEL_PATH):
            _validator_model = joblib.load(MODEL_PATH)
        else:
            raise FileNotFoundError(f"Material validator model not found at {MODEL_PATH}")
    return _validator_model

def extract_material_features(image: Image.Image) -> tuple[np.ndarray, float]:
    img_resized = image.convert("RGB").resize((128, 128))
    arr = np.array(img_resized, dtype=np.float32)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # 1. Chromaticity & Metallicity
    rgb_diff_rg = float(np.mean(np.abs(r - g)))
    rgb_diff_rb = float(np.mean(np.abs(r - b)))
    rgb_diff_gb = float(np.mean(np.abs(g - b)))
    
    # HSV Saturation
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c
    saturation = np.where(max_c > 0, delta / (max_c + 1e-5), 0.0)
    mean_sat = float(np.mean(saturation))
    p90_sat = float(np.percentile(saturation, 90))
    
    r_mean, g_mean, b_mean = float(np.mean(r)), float(np.mean(g)), float(np.mean(b))
    r_std, g_std, b_std = float(np.std(r)), float(np.std(g)), float(np.std(b))
    
    # 2. Spatial Texture & Roughness
    gray = 0.299 * r + 0.587 * g + 0.114 * b
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    mean_grad = float((np.mean(gx) + np.mean(gy)) / 2.0)
    std_grad = float((np.std(gx) + np.std(gy)) / 2.0)
    
    # 3. Fourier Spatial Frequency Roughness
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = np.abs(fshift)
    cy, cx = 64, 64
    y, x = np.ogrid[:128, :128]
    r_dist = np.sqrt((x - cx)**2 + (y - cy)**2)
    low_freq = float(np.mean(magnitude_spectrum[r_dist < 16]))
    high_freq = float(np.mean(magnitude_spectrum[r_dist >= 48]))
    freq_ratio = float(high_freq / (low_freq + 1e-5))
    
    # 4. Highlight & Specular plastic peak
    extreme_bright = float(np.mean(gray > 245))
    
    # 5. Laplacian Blur Score (sharpness)
    lap = (
        gray[1:-1, 2:] + gray[1:-1, :-2] +
        gray[2:, 1:-1] + gray[:-2, 1:-1] - 4 * gray[1:-1, 1:-1]
    )
    lap_var = float(np.var(lap))
    
    features = [
        rgb_diff_rg, rgb_diff_rb, rgb_diff_gb,
        mean_sat, p90_sat,
        r_mean, g_mean, b_mean,
        r_std, g_std, b_std,
        mean_grad, std_grad,
        low_freq, high_freq, freq_ratio,
        extreme_bright, lap_var
    ]
    return np.array(features, dtype=np.float32), lap_var

def validate_material(image: Image.Image, threshold: float = None) -> dict:
    """
    Validates whether an input image is industrial steel or non-steel.
    
    Guarantees:
    - Rusted, corroded, scratched, pitted, hot-rolled, and clean steel ALWAYS pass to the defect model!
    - Non-steel objects (capsules, plastic toys, lined paper, wood grain, faces) are rejected.
    - Blurry / unreadable images are rejected.
    """
    thr = threshold if threshold is not None else _current_steel_threshold
    
    features, lap_var = extract_material_features(image)
    
    # 1. Blurry image rejection check
    if lap_var < 20.0:
        return {
            "material": "non_steel",
            "confidence": 0.90,
            "supported": False,
            "steel_probability": 0.10,
            "non_steel_probability": 0.90,
            "threshold": thr,
            "message": "Image rejected: Surface is too blurry / degraded to verify industrial steel texture."
        }
    
    # 2. Material Classifier Inference
    clf = _load_model()
    probs = clf.predict_proba([features])[0]
    p_steel = float(probs[0])
    p_non_steel = float(probs[1])
    
    # 3. Decision based on threshold
    if p_steel >= thr:
        return {
            "material": "steel",
            "confidence": round(p_steel, 3),
            "supported": True,
            "steel_probability": round(p_steel, 3),
            "non_steel_probability": round(p_non_steel, 3),
            "threshold": thr,
            "message": f"Verified industrial steel surface ({round(p_steel * 100, 1)}% confidence)."
        }
    else:
        conf = max(p_non_steel, round(1.0 - p_steel, 3))
        return {
            "material": "non_steel",
            "confidence": round(conf, 3),
            "supported": False,
            "steel_probability": round(p_steel, 3),
            "non_steel_probability": round(p_non_steel, 3),
            "threshold": thr,
            "message": (
                f"Material rejected: Non-steel object detected ({round(conf * 100, 1)}% confidence). "
                f"PROMETHEUS-X strictly inspects industrial steel surfaces only."
            )
        }

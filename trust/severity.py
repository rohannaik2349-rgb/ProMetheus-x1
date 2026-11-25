import numpy as np

def extract_regions(amap: np.ndarray, pix_thr: float, min_area: int = 40):
    """
    Find connected regions above pixel threshold.
    """
    mask = (amap > pix_thr).astype(np.uint8)
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    regions = []

    # Simple bounding box cluster detection for connected components
    for y in range(0, h, 8):
        for x in range(0, w, 8):
            if mask[y, x] and not visited[y, x]:
                # Expand box
                y2 = min(h, y + 32)
                x2 = min(w, x + 32)
                sub = mask[y:y2, x:x2]
                area = int(np.sum(sub))
                if area >= min_area:
                    visited[y:y2, x:x2] = True
                    peak = float(amap[y:y2, x:x2].max())
                    regions.append({
                        "bbox": [int(x), int(y), int(x2 - x), int(y2 - y)],
                        "area_px": area * 8, # scale estimate
                        "area_frac": round(float((area * 8) / (h * w)), 4),
                        "peak_score": round(peak, 2)
                    })

    # Deduplicate overlapping boxes
    out = []
    for r in regions:
        if not any(abs(r["bbox"][0] - o["bbox"][0]) < 24 and abs(r["bbox"][1] - o["bbox"][1]) < 24 for o in out):
            r["id"] = len(out) + 1
            out.append(r)

    return out, mask

def calculate_severity(
    amap: np.ndarray,
    regions: list,
    pix_thr: float,
    cfg: dict = None
) -> tuple[float, str, dict]:
    """
    Calculate defect severity score matching Section 7.6:
    S = w0*min(A/A_ref, 1) + w1*min(max(I-1, 0)/I_ref, 1) + w2*min(C/C_ref, 1)
    """
    if not regions:
        return 0.0, "None", {"A_term": 0.0, "I_term": 0.0, "C_term": 0.0}

    total_px = amap.size
    total_defect_px = sum(r["area_px"] for r in regions)
    A = total_defect_px / total_px
    I = max(r["peak_score"] for r in regions) / (pix_thr if pix_thr > 0 else 1.0)
    C = len(regions)

    A_ref = 0.02
    I_ref = 1.0
    C_ref = 5.0
    w = [0.5, 0.4, 0.1]

    A_term = w[0] * min(A / A_ref, 1.0)
    I_term = w[1] * min(max(I - 1.0, 0.0) / I_ref, 1.0)
    C_term = w[2] * min(C / C_ref, 1.0)

    S = float(min(A_term + I_term + C_term, 1.0))
    level = "Low" if S < 0.33 else "Medium" if S < 0.66 else "High"

    return round(S, 2), level, {
        "A_term": round(A_term, 3),
        "I_term": round(I_term, 3),
        "C_term": round(C_term, 3)
    }

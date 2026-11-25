import numpy as np

def concentration(amap: np.ndarray, top_frac: float = 0.01) -> float:
    """Share of score mass in top 1% pixels (Section 7.7)."""
    v = np.sort(amap.ravel())[::-1]
    total_mass = float(v.sum())
    if total_mass <= 1e-8:
        return 0.0
    k = max(1, int(len(v) * top_frac))
    return float(v[:k].sum() / total_mass)

def compute_mahalanobis_shift(image_rgb: np.ndarray, mean_ref: np.ndarray = None) -> float:
    """
    Compute global feature shift indicator from RGB channel statistics and spatial covariance.
    """
    # Channel means and std deviations
    ch_means = image_rgb.mean(axis=(0, 1)) / 255.0
    # Expected normal steel values around [0.55, 0.58, 0.62]
    expected_norm = np.array([0.55, 0.58, 0.62]) if mean_ref is None else mean_ref
    diff = ch_means - expected_norm
    # Shrunk Mahalanobis distance proxy
    dist = float(np.sqrt(np.sum((diff * 4.5) ** 2)) * 3.2)
    return round(dist, 2)

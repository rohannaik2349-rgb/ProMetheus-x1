import numpy as np

def p_value(score: float, calib_scores: list[float]) -> float:
    """Compute non-parametric conformal p-value (Section 7.5)."""
    cal = np.asarray(calib_scores)
    return float((1.0 + np.sum(cal >= score)) / (len(cal) + 1.0))

def threshold(calib_scores: list[float], alpha: float = 0.05) -> float:
    """Compute empirical quantile conformal threshold at alpha."""
    cal = np.sort(np.asarray(calib_scores))
    n = len(cal)
    k = int(np.ceil((n + 1) * (1.0 - alpha)))
    if k > n:
        return float(cal[-1])
    return float(cal[k - 1])

def finest_alpha(n: int) -> float:
    """Return smallest statistically honest alpha: 1 / (n + 1)."""
    return float(1.0 / (n + 1.0))

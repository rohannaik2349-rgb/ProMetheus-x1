def decide(
    score: float,
    threshold: float,
    shift_score: float,
    shift_threshold: float,
    concentration: float,
    concentration_threshold: float,
    condition_unknown: bool = False
) -> str:
    """
    Decision table matching Section 7.8 & Section 24:
    if not anomalous and not shifted: NORMAL
    if not anomalous and shifted: SHIFT_WARNING
    if anomalous and not shifted: DEFECT
    if anomalous and shifted and not localized: SHIFT_HOLD
    otherwise: DEFECT_LOW_TRUST
    """
    anomalous = score > threshold
    shifted = shift_score > shift_threshold or condition_unknown
    localized = concentration >= concentration_threshold

    if not anomalous and not shifted:
        return "NORMAL"
    if not anomalous and shifted:
        return "SHIFT_WARNING"
    if anomalous and not shifted:
        return "DEFECT"
    if anomalous and shifted and not localized:
        return "SHIFT_HOLD"
    return "DEFECT_LOW_TRUST"

def triage(
    decision: str,
    p: float,
    severity_level: str,
    alpha_pass: float = 0.10,
    alpha_reject: float = 0.02
) -> str:
    """
    Triage rule matching Section 7.8 & Section 24:
    NORMAL + p >= alpha_pass -> PASS
    DEFECT + p <= alpha_reject + Medium/High -> REJECT
    otherwise -> REVIEW
    """
    if decision == "NORMAL" and p >= alpha_pass:
        return "PASS"
    if decision in ("DEFECT", "DEFECT_LOW_TRUST") and p <= alpha_reject and severity_level in ("Medium", "High"):
        return "REJECT"
    return "REVIEW"

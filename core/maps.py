import os
import numpy as np
from PIL import Image, ImageFilter

def apply_jet_colormap(gray_norm: np.ndarray) -> np.ndarray:
    """
    Applies standard JET colormap onto normalized 2D anomaly float array (0.0 to 1.0).
    Returns (H, W, 3) RGB uint8 image.
    """
    x = np.clip(gray_norm, 0.0, 1.0)
    
    # 4-segment linear interpolation matching matplotlib/opencv JET
    r = np.clip(1.5 - np.abs(4.0 * x - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * x - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * x - 1.0), 0.0, 1.0)

    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255).astype(np.uint8)

def generate_and_save_artifacts(
    image_rgb: np.ndarray,
    amap: np.ndarray,
    vmax: float,
    artifact_dir: str
) -> tuple[str, str, str]:
    """
    Saves heatmap.png, mask.png, and overlay.png in the inspection artifact folder.
    Returns relative paths.
    """
    os.makedirs(artifact_dir, exist_ok=True)

    # 1. Heatmap
    norm_map = np.clip(amap / (vmax if vmax > 0 else 1.0), 0.0, 1.0)
    jet_rgb = apply_jet_colormap(norm_map)
    heatmap_pil = Image.fromarray(jet_rgb).filter(ImageFilter.GaussianBlur(radius=3))
    heatmap_path = os.path.join(artifact_dir, "heatmap.png")
    heatmap_pil.save(heatmap_path, "PNG")

    # 2. Defect Mask
    mask_arr = (norm_map > 0.65).astype(np.uint8) * 255
    mask_pil = Image.fromarray(mask_arr, mode="L")
    mask_path = os.path.join(artifact_dir, "mask.png")
    mask_pil.save(mask_path, "PNG")

    # 3. Blended Overlay (55% steel + 45% heatmap)
    steel_pil = Image.fromarray(image_rgb).resize(heatmap_pil.size)
    overlay_pil = Image.blend(steel_pil, heatmap_pil, alpha=0.45)
    overlay_path = os.path.join(artifact_dir, "overlay.png")
    overlay_pil.save(overlay_path, "PNG")

    return heatmap_path, mask_path, overlay_path

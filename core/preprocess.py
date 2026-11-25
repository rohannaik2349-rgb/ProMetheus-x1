import io
import numpy as np
from PIL import Image

def load_rgb_image(raw_bytes: bytes) -> np.ndarray:
    """
    Decodes an image from bytes and strictly validates that it is a 3-channel RGB image.
    Never converts to grayscale.
    """
    try:
        img = Image.open(io.BytesIO(raw_bytes))
    except Exception as e:
        raise ValueError(f"Could not decode image: {e}")

    # Check color channels
    if img.mode != "RGB":
        # If RGBA, drop alpha safely while preserving original 3-color RGB
        if img.mode == "RGBA":
            img = img.convert("RGB")
        else:
            raise ValueError(f"Expected a 3-channel colour image (RGB), but got image mode: {img.mode}")

    arr = np.array(img, dtype=np.uint8)
    if arr.ndim != 3 or arr.shape[2] != 3:
        raise ValueError("Expected a 3-channel colour image (H, W, 3)")

    return arr

def tile_image(img: np.ndarray, size: int = 256, stride: int = 224):
    """
    Cut image into 256x256 tiles with stride 224.
    """
    h, w = img.shape[:2]
    # Resize if smaller than tile size
    if h < size or w < size:
        s = size / min(h, w)
        pil_img = Image.fromarray(img).resize((int(w * s) + 1, int(h * s) + 1), Image.BILINEAR)
        img = np.array(pil_img)
        h, w = img.shape[:2]

    ys = list(range(0, h - size + 1, stride))
    xs = list(range(0, w - size + 1, stride))
    if ys[-1] + size < h:
        ys.append(h - size)
    if xs[-1] + size < w:
        xs.append(w - size)

    tiles = []
    for y in ys:
        for x in xs:
            tiles.append((y, x, img[y:y + size, x:x + size]))
    return img, tiles

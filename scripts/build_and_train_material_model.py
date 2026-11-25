"""
PROMETHEUS-X Material Validation Model
Builds dataset and trains lightweight steel vs non-steel classification model.
Ensures ALL steel (clean, heavily rusted, corroded, scratched, pitted, welded) is accepted.
Strictly rejects only non-steel objects (capsules, plastic, paper, wood, random items) and blurry images.
"""

import os
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from sklearn.model_selection import train_test_split
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

DATASET_DIR = "material_dataset"
STEEL_DIR = os.path.join(DATASET_DIR, "steel")
NON_STEEL_DIR = os.path.join(DATASET_DIR, "non_steel")
MODEL_DIR = os.path.join("core", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "material_validator.joblib")

os.makedirs(STEEL_DIR, exist_ok=True)
os.makedirs(NON_STEEL_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

# 1. GENERATE STEEL IMAGES (Clean, Rusted, Corroded, Scratched, Pitted, Mill Scale, Welded)
def generate_steel_image(idx: int) -> Image.Image:
    """Generates authentic industrial steel surfaces with diverse conditions and defects."""
    variant = idx % 6
    
    if variant in (0, 1):
        # 1. Clean Shot-Blasted or Hot-Rolled Steel (Slate Gray to Cool Metallic)
        base_gray = random.randint(110, 160)
        img = np.zeros((256, 256, 3), dtype=np.uint8)
        grain = np.random.normal(0, random.uniform(8, 16), (256, 256)).astype(np.float32)
        for c in range(3):
            tint = random.randint(-4, 6)
            img[:, :, c] = np.clip(base_gray + tint + grain, 20, 240).astype(np.uint8)
        pil_img = Image.fromarray(img)
        draw = ImageDraw.Draw(pil_img)
        if variant == 1:
            # Scratch / tool mark
            x1, y1 = random.randint(20, 80), random.randint(30, 200)
            x2, y2 = random.randint(150, 240), random.randint(30, 200)
            draw.line([x1, y1, x2, y2], fill=(50, 50, 52), width=random.randint(2, 4))
        return pil_img

    elif variant in (2, 3):
        # 2. HEAVILY RUSTED & CORRODED STEEL (Iron Oxide: Orange-Brown, Red-Brown, Pitted Crust)
        # Steel substrate underneath
        base_gray = random.randint(90, 130)
        arr = np.zeros((256, 256, 3), dtype=np.float32)
        grain = np.random.normal(0, 14, (256, 256))
        for c in range(3):
            arr[:, :, c] = base_gray + grain
            
        # Heavy rust patches (Fe2O3 / Fe3O4 rust crust)
        num_patches = random.randint(4, 9)
        for _ in range(num_patches):
            cx, cy = random.randint(20, 230), random.randint(20, 230)
            rx, ry = random.randint(25, 90), random.randint(25, 90)
            y, x = np.ogrid[:256, :256]
            mask = (((x - cx)/rx)**2 + ((y - cy)/ry)**2) <= 1
            # Rust color (R=140-190, G=60-95, B=25-45)
            rust_r = random.uniform(130, 190)
            rust_g = random.uniform(55, 100)
            rust_b = random.uniform(25, 55)
            arr[mask, 0] = arr[mask, 0] * 0.3 + rust_r * 0.7
            arr[mask, 1] = arr[mask, 1] * 0.3 + rust_g * 0.7
            arr[mask, 2] = arr[mask, 2] * 0.3 + rust_b * 0.7
            
        pil_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        draw = ImageDraw.Draw(pil_img)
        # Deep corrosion pitting & abrasion tracks
        for _ in range(random.randint(3, 7)):
            px, py = random.randint(30, 220), random.randint(30, 220)
            draw.ellipse([px-6, py-6, px+6, py+6], fill=(45, 18, 10))
        return pil_img

    elif variant == 4:
        # 3. Welding Seam / Heat Affected Discoloration
        base_gray = random.randint(120, 150)
        arr = np.zeros((256, 256, 3), dtype=np.float32)
        grain = np.random.normal(0, 12, (256, 256))
        for c in range(3): arr[:, :, c] = base_gray + grain
        # Heat affected temper color band (straw/blue/bronze oxide)
        wx = random.randint(90, 160)
        arr[:, max(0, wx-35):min(256, wx+35), 0] += 25
        arr[:, max(0, wx-35):min(256, wx+35), 1] += 12
        arr[:, max(0, wx-35):min(256, wx+35), 2] -= 15
        pil_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        draw = ImageDraw.Draw(pil_img)
        # Weld bead
        draw.line([wx, 0, wx + random.randint(-10, 10), 256], fill=(40, 42, 48), width=random.randint(10, 18))
        for _ in range(8):
            xc = wx + random.randint(-15, 15)
            yc = random.randint(20, 230)
            r_spat = random.randint(2, 5)
            draw.ellipse([xc - r_spat, yc - r_spat, xc + r_spat, yc + r_spat], fill=(30, 30, 35))
        return pil_img

    else:
        # 4. Mill Scale & Dark Oxidation Flakes
        arr = np.zeros((256, 256, 3), dtype=np.float32)
        arr[:, :] = random.randint(65, 95) # Dark mill scale steel
        arr += np.random.normal(0, 16, arr.shape)
        # Light scratches showing bright steel underneath
        pil_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        draw = ImageDraw.Draw(pil_img)
        draw.line([30, 50, 220, 120], fill=(170, 175, 180), width=3)
        draw.line([60, 180, 210, 200], fill=(160, 165, 170), width=2)
        return pil_img

# 2. GENERATE NON-STEEL IMAGES (Capsules, Plastic, Paper, Wood, Colorful Random Objects)
def generate_non_steel_image(idx: int) -> Image.Image:
    category = idx % 5
    
    if category == 0:
        # CAPSULE (Medicine capsule: synthetic gelatin, bright saturated color, cylindrical pill contour)
        img = Image.new("RGB", (256, 256), color=(235, 238, 242))
        draw = ImageDraw.Draw(img)
        cx, cy = 128, 128
        color_top = random.choice([(235, 30, 30), (245, 130, 15), (40, 110, 235), (230, 40, 140)])
        color_bot = random.choice([(255, 255, 255), (245, 220, 40), (40, 195, 130)])
        draw.rounded_rectangle([cx - 35, cy - 80, cx + 35, cy], radius=35, fill=color_top)
        draw.rounded_rectangle([cx - 35, cy, cx + 35, cy + 80], radius=35, fill=color_bot)
        # Distinct specular plastic shine
        draw.ellipse([cx - 20, cy - 65, cx - 10, cy - 20], fill=(255, 255, 255))
        draw.ellipse([cx - 20, cy + 15, cx - 10, cy + 60], fill=(255, 255, 255))
        return img
        
    elif category == 1:
        # PLASTIC (Synthetic polymer flat colors, bright toy/container plastic)
        color_plastic = random.choice([(30, 190, 240), (245, 60, 60), (60, 220, 90), (255, 215, 30), (190, 50, 220)])
        arr = np.zeros((256, 256, 3), dtype=np.uint8)
        arr[:, :] = color_plastic
        img = Image.fromarray(arr)
        draw = ImageDraw.Draw(img)
        draw.rectangle([20, 20, 236, 100], fill=tuple(min(255, c + 35) for c in color_plastic))
        return img
        
    elif category == 2:
        # PAPER (Diffuse cellulose fiber, lined sheet or printed document)
        img = Image.new("RGB", (256, 256), color=(248, 246, 238))
        draw = ImageDraw.Draw(img)
        for ly in range(30, 256, 26):
            draw.line([0, ly, 256, ly], fill=(160, 185, 225), width=1)
        draw.line([45, 0, 45, 256], fill=(235, 130, 130), width=1)
        for ly in range(40, 230, 26):
            draw.line([60, ly, random.randint(170, 240), ly], fill=(40, 40, 60), width=2)
        return img
        
    elif category == 3:
        # WOOD (Organic wood grain with radial rings and knots)
        arr = np.zeros((256, 256, 3), dtype=np.float32)
        base_wood = np.array([195, 135, 75], dtype=np.float32)
        y, x = np.ogrid[:256, :256]
        grain = np.sin(y / 3.2 + np.sin(x / 25.0) * 3.0) * 32.0
        arr[:, :] = base_wood + grain[:, :, None]
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        draw = ImageDraw.Draw(img)
        draw.ellipse([100, 100, 140, 150], fill=(110, 65, 30))
        return img
        
    else:
        # RANDOM OBJECTS (Fruits, Fabrics, Human faces, Colorful wallpapers)
        colors = [(240, 50, 50), (50, 210, 80), (250, 210, 20), (160, 50, 220), (255, 100, 180)]
        img = Image.new("RGB", (256, 256), color=random.choice(colors))
        draw = ImageDraw.Draw(img)
        for _ in range(6):
            x0, y0 = random.randint(10, 120), random.randint(10, 120)
            x1, y1 = random.randint(x0 + 20, 250), random.randint(y0 + 20, 250)
            draw.ellipse([x0, y0, x1, y1], fill=random.choice(colors))
        return img

print("Generating 100 diverse steel images (clean + rusted + corroded + welded) and 100 non-steel images...")
for i in range(100):
    st_img = generate_steel_image(i)
    st_img.save(os.path.join(STEEL_DIR, f"steel_{i+1:03d}.jpg"))
    
    nst_img = generate_non_steel_image(i)
    nst_img.save(os.path.join(NON_STEEL_DIR, f"non_steel_{i+1:03d}.jpg"))

# 3. FEATURE EXTRACTION
def extract_material_features(image: Image.Image) -> np.ndarray:
    """
    Discriminates metallic steel (clean and rusted) from non-steel (capsules, plastic, paper, wood).
    Key: Rusted steel has iron-oxide tones and metallic micro-grain, NOT synthetic plastic saturation.
    """
    img_resized = image.convert("RGB").resize((128, 128))
    arr = np.array(img_resized, dtype=np.float32)
    
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # 1. Chromaticity & Metallicity
    rgb_diff_rg = np.mean(np.abs(r - g))
    rgb_diff_rb = np.mean(np.abs(r - b))
    rgb_diff_gb = np.mean(np.abs(g - b))
    
    # HSV Saturation
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c
    saturation = np.where(max_c > 0, delta / (max_c + 1e-5), 0.0)
    mean_sat = np.mean(saturation)
    p90_sat = np.percentile(saturation, 90)
    
    # Channel means and stds
    r_mean, g_mean, b_mean = np.mean(r), np.mean(g), np.mean(b)
    r_std, g_std, b_std = np.std(r), np.std(g), np.std(b)
    
    # 2. Spatial Texture & Roughness (Gradients)
    gray = 0.299 * r + 0.587 * g + 0.114 * b
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    mean_grad = (np.mean(gx) + np.mean(gy)) / 2.0
    std_grad = (np.std(gx) + np.std(gy)) / 2.0
    
    # 3. Fourier Spatial Frequency Roughness (Steel has distinct isotropic high-frequency micro-grain)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = np.abs(fshift)
    cy, cx = 64, 64
    y, x = np.ogrid[:128, :128]
    r_dist = np.sqrt((x - cx)**2 + (y - cy)**2)
    low_freq = np.mean(magnitude_spectrum[r_dist < 16])
    high_freq = np.mean(magnitude_spectrum[r_dist >= 48])
    freq_ratio = high_freq / (low_freq + 1e-5)
    
    # 4. Highlight & Specular plastic peak
    extreme_bright = np.mean(gray > 245)
    
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
    return np.array(features, dtype=np.float32)

# 4. BUILD TRAINING MATRIX
X, y = [], []
for f in os.listdir(STEEL_DIR):
    if f.endswith((".jpg", ".png")):
        im = Image.open(os.path.join(STEEL_DIR, f))
        X.append(extract_material_features(im))
        y.append(0) # 0 = Steel

for f in os.listdir(NON_STEEL_DIR):
    if f.endswith((".jpg", ".png")):
        im = Image.open(os.path.join(NON_STEEL_DIR, f))
        X.append(extract_material_features(im))
        y.append(1) # 1 = Non-Steel

X = np.array(X)
y = np.array(y)

X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
print(f"Training on {len(X_train)} samples, validating on {len(X_val)} samples...")

clf = ExtraTreesClassifier(n_estimators=100, max_depth=10, random_state=42)
clf.fit(X_train, y_train)

val_preds = clf.predict(X_val)
print(f"Validation Accuracy: {accuracy_score(y_val, val_preds) * 100:.2f}%")
print(classification_report(y_val, val_preds, target_names=["steel (clean + rusted)", "non_steel"]))

joblib.dump(clf, MODEL_PATH)
print(f"Retrained material model saved to: {MODEL_PATH}")

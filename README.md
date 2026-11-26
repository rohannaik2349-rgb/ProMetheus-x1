# PROMETHEUS-X — Detect. Doubt. Adapt.

**Open-Set 3-Channel RGB Steel Surface Inspection Platform with an Epistemic Trust Layer**

PROMETHEUS-X is a full-stack industrial quality-control platform for steel surface inspection. Rather than relying on closed-set classifiers that silently fail on unseen defects or optical lighting shifts, PROMETHEUS-X pairs PatchCore-style multi-scale RGB anomaly detection with split-conformal calibration, Mahalanobis shift monitoring, false-positive suppression, and automated ReportLab inspection certificates.

---

## Core Capabilities

### 1. Material Validation Layer (Pre-Inspection Gatekeeper)
- **Strict Steel-Only Enforcement:** Every uploaded image passes through `core/material_validator.py` before reaching the defect detection pipeline.
- **Rust & Defect Safe:** Trained on clean, heavily rusted, corroded, scratched, mill-scale, and welded steel (`material_dataset/steel/`) versus non-steel objects (`material_dataset/non_steel/` — capsules, plastic, paper, wood, random objects) and blurry frames. Rusted and damaged steel is always routed to the defect model.
- **Configurable Threshold:** `DEFAULT_STEEL_THRESHOLD = 0.55` (adjustable at runtime via `/material/threshold`). Non-steel or blurry uploads return HTTP `422` (`MATERIAL_REJECTED`) without executing defect inference.

### 2. Surface Inspector Canvas & Vector Matrices
- **3-Channel RGB Inspection:** Preserves full RGB chromaticity for iron-oxide rust, temper discoloration, scale, and seam defects (`core/preprocess.py`, `core/pipeline.py`).
- **Interactive Overlays:** Toggle bounding boxes/vectors, adjust JET anomaly heatmap opacity (`Steel`, `Blend`, `Map`), inspect **The 6 Questions Matrix**, override triage (`PASS` / `REVIEW` / `REJECT`), or mark harmless variations for suppression.
- **16×16 Vector Matrix Viewer:** Click **Matrix** in the inspector controls to inspect the 256-patch spatial L2 distance grid, patch embedding slices $\phi(x)[0:8]$ vs. nearest coreset vector $m^*[0:8]$, residual vectors, and Mahalanobis shift stats.
- **Clean Reset & Upload:** Cancel/remove the current specimen or upload a new image at any time.

### 3. Epistemic Trust Layer (`trust/`)
- **Split-Conformal Calibration (`trust/calibration.py`):** Produces calibrated $p$-values with bounded false-alarm guarantees ($\alpha = 0.05$).
- **Composite Severity Scoring (`trust/severity.py`):** Combines area fraction ($A$), peak anomaly intensity ($I$), and patch concentration ($C$).
- **Optical Shift Detection (`trust/shift.py`):** Separates global illumination/camera drift (diffuse Mahalanobis shift) from localized physical defects, preventing false rejections via `SHIFT_HOLD`.
- **5-Class Decision & Triage (`trust/triage.py`):** `NORMAL`, `DEFECT`, `SHIFT_WARNING`, `SHIFT_HOLD`, and `DEFECT_LOW_TRUST` mapped to `PASS`, `REVIEW`, or `REJECT`.

### 4. High-Speed Production Line Monitor
- **60 FPS Optical Scanner:** Real-time steel coil conveyor with speed controls (`0.5x`, `1.0x`, `2.5x High Speed`, `5.0x Turbo`), dual-beam laser focal-plane pulses, and an **Emergency Stop** safety interlock.
- **CUSUM & EWMA Drift Monitoring:** Rolling shift-score chart against control limit $h = 2.45$, plus interactive **Inject 40% Dimming** and **Adapt Baseline** controls.

### 5. Official 2-Page PDF Certificates (`api/pdf_report.py`)
- Server-side **ReportLab** generator producing a 2-page A4 inspection certificate containing the specimen image with localized yellow bounding boxes and anomaly overlays, conformal $p$-values, severity breakdown, optical shift status, detected regions table, and inspector sign-off.

### 6. Condition Adaptation, Suppression Bank & Audit Chain
- **Condition Adaptor (`ConditionAdaptorView.tsx`):** Adapt baseline calibration to new lighting/line conditions.
- **Defect Families (`DefectFamiliesView.tsx`):** Group and track recurring defect clusters.
- **Cryptographic Audit Chain (`AuditLogView.tsx`, `db/repo.py`):** SHA-256 hash-chained log of inspections, sample selections, overrides, suppressions, and material rejections persisted in SQLite (`prometheus.db`).

---

## Project Structure

```text
ProMetheus-x/
├── api/
│   ├── main.py                # FastAPI app, routes, CORS, static artifacts
│   ├── pdf_report.py          # 2-page A4 ReportLab PDF certificate generator
│   ├── schemas.py             # Pydantic request/response models
│   └── deps.py                # Dependency helpers
├── core/
│   ├── material_validator.py  # Steel vs. non-steel/blurry validation engine
│   ├── pipeline.py            # Main RGB anomaly detection & trust orchestration
│   ├── preprocess.py          # 3-channel RGB image validation & decoding
│   ├── maps.py                # Heatmap & mask artifact generation
│   └── models/                # Saved material validator weights (.joblib)
├── trust/
│   ├── calibration.py         # Conformal p-value calibration
│   ├── severity.py            # Composite defect severity estimation
│   ├── shift.py               # Mahalanobis shift & patch concentration
│   └── triage.py              # 5-class decision & triage logic
├── db/
│   ├── database.py            # SQLAlchemy engine & session management
│   ├── models.py              # ORM models (images, inspections, regions, audit, etc.)
│   └── repo.py                # Audit chain & condition repository helpers
├── scripts/
│   └── build_and_train_material_model.py  # Dataset generator & validator trainer
├── material_dataset/          # Steel & non-steel training/validation images
├── src/
│   ├── api/client.ts          # Typed FastAPI client & MaterialRejectionError
│   ├── core/engine.ts         # Client-side SHA-256 & trust utilities
│   ├── data/samples.ts        # Curated 3-channel RGB steel scenarios & heatmaps
│   ├── types/index.ts         # TypeScript interfaces
│   └── components/
│       ├── HeroWelcome.tsx
│       ├── Header.tsx
│       ├── InspectorView.tsx
│       ├── LineMonitorView.tsx
│       ├── CalibrationLabView.tsx
│       ├── ConditionAdaptorView.tsx
│       ├── AuditLogView.tsx
│       ├── DefectFamiliesView.tsx
│       └── ReportModal.tsx
├── package.json
├── requirements.txt
└── vite.config.ts
```

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, `canvas-confetti`, `jspdf`, `html2canvas`
- **Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic, SQLAlchemy (SQLite), NumPy, SciPy, scikit-learn, Pillow, ReportLab

---

## Getting Started

### Prerequisites
- **Node.js** (v18+ recommended) and **npm**
- **Python 3.12+** (or `uv`)

### 1. Backend Setup (FastAPI on `:8000`)

```bash
# Create and activate a virtual environment (example using venv)
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
pip install reportlab

# (Optional) Regenerate material dataset and retrain the material validator
python scripts/build_and_train_material_model.py

# Start the FastAPI server
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Interactive API docs will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup (Vite on `:5173`)

```bash
# Install Node dependencies
npm install

# Start the development server
npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173` in your browser.

### Production Frontend Build

```bash
npm run build
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend health, active model version, and current line condition |
| `POST` | `/inspect` | Runs material validation first; if steel, executes RGB defect pipeline |
| `POST` | `/material/validate` | Standalone steel vs. non-steel classification check |
| `GET` / `POST` | `/material/threshold` | Read or update `STEEL_THRESHOLD` |
| `POST` | `/feedback` | Submit `MARK_HARMLESS`, `OVERRIDE_TRIAGE`, or `CONFIRM_DEFECT` |
| `POST` | `/adapt` | Adapt calibration baseline to a new optical condition |
| `GET` | `/conditions` | List production conditions and active pointer |
| `GET` | `/history` | Retrieve recent inspection records |
| `GET` | `/audit` | Retrieve SHA-256 hash-chained audit trail |
| `POST` | `/report/generate` | Generate & download 2-page ReportLab PDF from inspection payload |
| `GET` | `/report/{inspection_id}/pdf` | Download stored ReportLab PDF certificate by inspection ID |

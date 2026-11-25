export const API_BASE = "http://localhost:8000";

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    if (!res.ok) return { connected: false, error: await res.text() };
    const data = await res.json();
    return { connected: true, ...data };
  } catch (err: any) {
    return { connected: false, error: err.message || "Failed to reach backend" };
  }
}

export class MaterialRejectionError extends Error {
  materialData: {
    material: string;
    confidence: number;
    supported: boolean;
    threshold?: number;
    steel_probability?: number;
    non_steel_probability?: number;
    message?: string;
    detail?: string;
  };
  constructor(materialData: any) {
    super(materialData.message || "Material rejected: Non-steel object detected.");
    this.name = "MaterialRejectionError";
    this.materialData = materialData;
  }
}

export async function inspectImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/inspect`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errJson: any = null;
    try {
      errJson = await response.json();
    } catch (e) {
      // not JSON
    }

    if (errJson && (errJson.error === "MATERIAL_REJECTED" || errJson.supported === false)) {
      throw new MaterialRejectionError(errJson);
    }
    const errText = errJson?.detail || errJson?.message || (await response.text().catch(() => "Inspection failed"));
    throw new Error(errText);
  }

  return response.json();
}

export async function getSteelThreshold() {
  const res = await fetch(`${API_BASE}/material/threshold`);
  return res.json();
}

export async function setSteelThreshold(threshold: number) {
  const res = await fetch(`${API_BASE}/material/threshold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threshold })
  });
  return res.json();
}

export async function getInspection(id: number) {
  const res = await fetch(`${API_BASE}/inspections/${id}`);
  if (!res.ok) throw new Error("Could not fetch inspection");
  return res.json();
}

export async function getHistory(limit: number = 20) {
  const res = await fetch(`${API_BASE}/history?limit=${limit}`);
  if (!res.ok) throw new Error("Could not fetch history");
  return res.json();
}

export async function submitFeedback(payload: {
  inspection_id: number;
  region_id?: number | null;
  action: string;
  user_name?: string;
  note?: string;
}) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Feedback submission failed");
  return res.json();
}

export async function adaptConditionApi(payload: {
  condition_name: string;
  sample_count: number;
  alpha?: number;
}) {
  const res = await fetch(`${API_BASE}/adapt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Condition adaptation failed");
  return res.json();
}

export async function getConditions() {
  const res = await fetch(`${API_BASE}/conditions`);
  if (!res.ok) throw new Error("Failed to load conditions");
  return res.json();
}

export async function getAuditTrail() {
  const res = await fetch(`${API_BASE}/audit`);
  if (!res.ok) throw new Error("Failed to load audit trail");
  return res.json();
}

export async function downloadReportLabPdf(payload: any) {
  const res = await fetch(`${API_BASE}/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("ReportLab PDF generation failed on backend");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const idStr = String(payload.inspection_id || 1).padStart(4, "0");
  a.download = `PROMETHEUS-X_Inspection_Report_PX-DEMO-${idStr}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function fileUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

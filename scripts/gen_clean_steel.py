import numpy as np
import urllib.request
import uuid
import json
from PIL import Image

np.random.seed(42)
base_gray = 148
grain = np.random.normal(0, 10.0, (512, 512)).astype(np.float32)
arr = np.zeros((512, 512, 3), dtype=np.uint8)
for c, tint in enumerate([-3, 0, 4]):
    arr[:, :, c] = np.clip(base_gray + tint + grain, 30, 235).astype(np.uint8)

out_path = r"d:\ProMetheus-x\sample_clean_steel_zero_defect.png"
Image.fromarray(arr).save(out_path, format="PNG")

boundary = uuid.uuid4().hex
with open(out_path, "rb") as f:
    file_bytes = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="sample_clean_steel_zero_defect.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()

req = urllib.request.Request(
    "http://127.0.0.1:8000/inspect",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
)
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
print("Status:", res.status)
print("Material:", data.get("material_validation", {}).get("material"), "Confidence:", data.get("material_validation", {}).get("confidence"))
print("Decision:", data.get("decision"), "Triage:", data.get("triage"), "Score:", data.get("image_score"), "Threshold:", data.get("threshold"), "P-value:", data.get("p_value"), "Regions:", len(data.get("regions", [])))

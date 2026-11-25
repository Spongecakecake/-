from pathlib import Path
import zipfile

root = Path(r"c:\Users\46093\Desktop\做到\.deploy-stage")
out = Path(r"c:\Users\46093\Desktop\做到\zuodao-deploy.zip")

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob("*"):
        if p.is_file():
            z.write(p, p.relative_to(root).as_posix())

print(f"wrote {out} ({out.stat().st_size} bytes)")

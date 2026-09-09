import zipfile
import os

SOURCE = r'c:\Users\visit\Downloads\sih26\sih26'
DEST   = r'c:\Users\visit\Downloads\BridgeX_Industry_Student_Flow.zip'

EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', '.dist', 'dist', '.pytest_cache'}

def should_skip(path):
    parts = path.replace('\\', '/').split('/')
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
    return False

with zipfile.ZipFile(DEST, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=7) as zf:
    for root, dirs, files in os.walk(SOURCE):
        # Prune excluded dirs in-place so os.walk doesn't descend
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for fname in files:
            fpath = os.path.join(root, fname)
            arcname = os.path.relpath(fpath, os.path.dirname(SOURCE))
            if not should_skip(arcname):
                zf.write(fpath, arcname)

print(f'ZIP created: {DEST}')
size_mb = os.path.getsize(DEST) / (1024*1024)
print(f'Size: {size_mb:.1f} MB')

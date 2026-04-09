#!/usr/bin/env python3
"""Run all fetchers. Call from project root: python scripts/fetch_all.py"""

import os
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
os.chdir(ROOT)

scripts = ["fetch_grants.py"]
for name in scripts:
    path = os.path.join(ROOT, "scripts", name)
    r = subprocess.run([sys.executable, path], cwd=ROOT)
    if r.returncode != 0:
        sys.exit(r.returncode)

print("All fetchers complete.")

# Windows: Python Launcher (py) — use this folder as cwd
Set-Location $PSScriptRoot
py -m pip install -r requirements.txt -q
py app.py

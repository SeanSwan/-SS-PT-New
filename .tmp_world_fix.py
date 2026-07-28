from pathlib import Path

path = Path(r'C:\tmp\ss-world-engine-20260712\experiments\world-factory\2026-07-12\five-family-proof-v1\qa\browser_qa.py')
text = path.read_text(encoding='utf-8')
text = text.replace("\n+            or set(assignments)", "\n            or set(assignments)")
path.write_text(text, encoding='utf-8')

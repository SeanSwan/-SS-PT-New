from pathlib import Path

path = Path(r'C:\tmp\ss-world-engine-20260712\experiments\world-factory\2026-07-12\five-family-proof-v1\qa\request_inventory_validation.py')
text = path.read_text(encoding='utf-8')
text = text.replace("\n+                or item.get('occurrences')", "\n                or item.get('occurrences')")
text = text.replace("or item.get('occurrences') != 1:\n\n            return False", "or item.get('occurrences') != 1:\n            return False")
path.write_text(text, encoding='utf-8')

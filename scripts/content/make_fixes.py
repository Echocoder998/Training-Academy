"""Record content corrections: for each starter item that changed, store its OLD field values.
seed.ts updates a live row only when it still matches an old version (i.e. nobody edited it).
Usage: python3 make_fixes.py <old seed-data.json>"""
import json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
NEW = os.path.join(here, "../../src/db/seed-data.json")
FIX = os.path.join(here, "../../src/db/seed-fixes.json")
FIELDS = {"lessons": ["title", "keyPoints", "quiz"], "specs": ["title", "application", "options", "answer", "why"],
          "scenarios": ["title", "persona", "opening", "hidden", "goodRec"]}
old, new = json.load(open(sys.argv[1])), json.load(open(NEW))
fixes = json.load(open(FIX)) if os.path.exists(FIX) else {k: {} for k in FIELDS}
n = 0
for kind, fields in FIELDS.items():
    o = {x["id"]: x for x in old[kind]}
    for x in new[kind]:
        prev = o.get(x["id"])
        if not prev: continue
        before = {f: prev[f] for f in fields if f in prev}
        if any(before.get(f) != x.get(f) for f in fields):
            lst = fixes.setdefault(kind, {}).setdefault(x["id"], [])
            if before not in lst: lst.append(before); n += 1
json.dump(fixes, open(FIX, "w"), indent=2, ensure_ascii=False)
print(f"recorded {n} corrections:", {k: list(v) for k, v in fixes.items() if v})

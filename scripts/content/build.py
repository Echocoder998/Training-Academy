"""Merge new content into seed-data.json (idempotent) and validate it."""
import json, sys, collections
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import abb, general, practice

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../src/db/seed-data.json")
d = json.load(open(P))

def upsert(lst, items):
    ids = {i["id"] for i in items}
    return [x for x in lst if x["id"] not in ids] + items

d["courses"] = upsert(d["courses"], general.COURSES[:1] + abb.COURSES + general.COURSES[1:])
d["lessons"] = upsert(d["lessons"], general.LESSONS[:2] + abb.LESSONS + general.LESSONS[2:])
d["specs"] = upsert(d["specs"], practice.SPECS)
d["scenarios"] = upsert(d["scenarios"], practice.SCENARIOS)
for p in d["paths"]:
    adds = practice.PATH_ADDS.get(p["id"], [])
    front = [c for c in adds if c == "c-welcome" and c not in p["courseIds"]]
    p["courseIds"] = front + p["courseIds"] + [c for c in adds if c not in p["courseIds"] and c not in front]
d["paths"] = upsert(d["paths"], practice.NEW_PATHS)
d["paths"].sort(key=lambda p: p["order"])

# ---- validation ----
errs = []
course_ids = {c["id"] for c in d["courses"]}
for k in ("courses", "lessons", "specs", "scenarios", "paths"):
    c = collections.Counter(x["id"] for x in d[k])
    errs += [f"dup {k} id {i}" for i, n in c.items() if n > 1]
dist = collections.Counter()
for l in d["lessons"]:
    if l["courseId"] not in course_ids: errs.append(f"lesson {l['id']} bad course")
    if len(l["quiz"]) < 4: errs.append(f"lesson {l['id']} short quiz")
    for q in l["quiz"]:
        if len(q["options"]) != 4 or not (0 <= q["answer"] < 4): errs.append(f"bad q in {l['id']}: {q['q']}")
        if len(set(q["options"])) != 4: errs.append(f"dup options in {l['id']}")
        dist[q["answer"]] += 1
for s in d["specs"]:
    if not (0 <= s["answer"] < len(s["options"])): errs.append(f"spec {s['id']} bad answer")
nums = collections.Counter(s["num"] for s in d["scenarios"])
errs += [f"dup scenario num {n}" for n, c in nums.items() if c > 1]
for p in d["paths"]:
    for c in p["courseIds"]:
        if c not in course_ids: errs.append(f"path {p['id']} bad course {c}")
    if len(set(p["courseIds"])) != len(p["courseIds"]): errs.append(f"path {p['id']} dup course")
for c in d["courses"]:
    if not any(l["courseId"] == c["id"] for l in d["lessons"]): errs.append(f"course {c['id']} has no lessons")

if errs:
    print("ERRORS:\n" + "\n".join(errs)); sys.exit(1)
json.dump(d, open(P, "w"), indent=2, ensure_ascii=False)
print(f"OK: {len(d['courses'])} courses, {len(d['lessons'])} lessons, {sum(len(l['quiz']) for l in d['lessons'])} questions, "
      f"{len(d['specs'])} specs, {len(d['scenarios'])} scenarios, {len(d['paths'])} paths. Answer spread: {dict(sorted(dist.items()))}")
for p in d["paths"]: print(p["id"], p["courseIds"])

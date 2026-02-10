#!/usr/bin/env python
"""Debug why IS 5101N Group 3 doesn't appear in permutations"""
import sys
sys.path.insert(0, '/Users/rapha/OneDrive/Desktop/Personal/Projects/ISMIS_Scheduler/backend')

from ismis_scheduler import generate_schedule_combinations, parse_schedule, schedules_conflict

# Your sample data
sample_data = {
    "CIS 2106N": [
        ("Group 9", "F 10:30 AM - 01:30 PM"),
        ("Group 10", "F 10:30 AM - 01:30 PM"),
        ("Group 11", "F 07:30 AM - 10:30 AM"),
        ("Group 12", "F 07:30 AM - 10:30 AM"),
        ("Group 13", "F 01:30 PM - 04:30 PM"),
        ("Group 14", "F 01:30 PM - 04:30 PM"),
    ],
    "IS 5101N": [
        ("Group 1", "F 03:00 PM - 08:00 PM"),
        ("Group 2", "F 03:00 PM - 08:00 PM"),
        ("Group 3", "Sat 07:30 AM - 12:30 PM"),
    ]
}

def build_courses_dict(data_dict):
    courses_by_code = {}
    for code, groups in data_dict.items():
        courses_by_code[code] = []
        for group_name, schedule in groups:
            courses_by_code[code].append({
                "code": f"{code} - {group_name}",
                "schedule": schedule
            })
    return courses_by_code

print("=" * 80)
print("SPECIFIC TEST: CIS 2106N Friday + IS 5101N (all three options)")
print("=" * 80)

courses = build_courses_dict(sample_data)

print("\nCIS 2106N sections (ALL FRIDAY):")
for c in courses["CIS 2106N"]:
    parsed = parse_schedule(c["schedule"])
    print(f"  {c['code']:25s} | {c['schedule']:25s} | Parsed: {parsed}")

print("\nIS 5101N sections:")
for c in courses["IS 5101N"]:
    parsed = parse_schedule(c["schedule"])
    print(f"  {c['code']:25s} | {c['schedule']:25s} | Parsed: {parsed}")

print("\n" + "=" * 80)
print("CHECKING FOR CONFLICTS")
print("=" * 80)

cis_friday_schedules = [(c["code"], parse_schedule(c["schedule"])) for c in courses["CIS 2106N"]]
is5_schedules = [(c["code"], parse_schedule(c["schedule"])) for c in courses["IS 5101N"]]

print("\nConflict matrix:")
print(f"{'CIS 2106N':<30} | {'IS 5101N':<30} | Conflict?")
print("-" * 75)

for cis_code, cis_parsed in cis_friday_schedules[:2]:  # Show sample
    for is5_code, is5_parsed in is5_schedules:
        conflict = schedules_conflict(cis_parsed, is5_parsed)
        status = "❌ CONFLICT" if conflict else "✅ OK"
        print(f"{cis_code:<30} | {is5_code:<30} | {status}")

print("\n" + "=" * 80)
print("GENERATING PERMUTATIONS")
print("=" * 80)

combos = generate_schedule_combinations(courses, max_combinations=500)

print(f"\n✓ Generated {len(combos)} valid combinations\n")

# Count which IS 5101N groups appear
is5_usage = {}
for combo in combos:
    for course in combo:
        if "IS 5101N" in course["code"]:
            group = course["code"].split(" - ")[1]
            is5_usage[group] = is5_usage.get(group, 0) + 1

print("IS 5101N groups in permutations:")
for group in sorted(is5_usage.keys()):
    sched = next(c[1] for c in sample_data["IS 5101N"] if c[0] == group)
    marker = "🔵 FRIDAY" if "F" in sched else "🟠 SATURDAY"
    print(f"  {group:10s}: {is5_usage[group]:3d} combinations {marker} ({sched})")

missing = set(g[0] for g in sample_data["IS 5101N"]) - set(is5_usage.keys())
if missing:
    print(f"\n⚠️ MISSING: {missing}")
    for m in missing:
        sched = next(c[1] for c in sample_data["IS 5101N"] if c[0] == m)
        print(f"   {m}: {sched}")
        
        # Show why it's missing
        is5_parsed = parse_schedule(sched)
        print(f"   Parsed: {is5_parsed}")
        
        for cis_code, cis_parsed in cis_friday_schedules:
            conflict = schedules_conflict(cis_parsed, is5_parsed)
            status = "CONFLICTS" if conflict else "OK"
            print(f"   vs {cis_code}: {status}")

print("\n" + "=" * 80)
print("SAMPLE COMBINATIONS")
print("=" * 80)

for idx, combo in enumerate(combos[:5], 1):
    print(f"\nCombo {idx}:")
    for course in combo:
        sched = course["schedule"]
        print(f"  {course['code']:30s} | {sched}")

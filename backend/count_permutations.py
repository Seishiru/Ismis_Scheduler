#!/usr/bin/env python
"""Calculate total permutations from your sample data"""
import sys
sys.path.insert(0, '/Users/rapha/OneDrive/Desktop/Personal/Projects/ISMIS_Scheduler/backend')

from ismis_scheduler import generate_schedule_combinations, parse_schedule, schedules_conflict

# Your sample data - EXCLUDING DISSOLVED
sample_data = {
    "CIS 2106N": [
        ("Group 1", "Sat 07:30 AM - 10:30 AM"),
        ("Group 2", "Sat 07:30 AM - 10:30 AM"),
        ("Group 3", "Sat 10:30 AM - 01:30 PM"),
        ("Group 4", "Sat 10:30 AM - 01:30 PM"),
        ("Group 5", "Sat 07:30 AM - 10:30 AM"),
        ("Group 6", "Sat 07:30 AM - 10:30 AM"),
        # EXCLUDED: Group 7 (DISSOLVED)
        # EXCLUDED: Group 8 (DISSOLVED)
        ("Group 9", "F 10:30 AM - 01:30 PM"),
        ("Group 10", "F 10:30 AM - 01:30 PM"),
        # EXCLUDED: Group 11 (DISSOLVED)
        ("Group 12", "F 07:30 AM - 10:30 AM"),
        ("Group 13", "F 01:30 PM - 04:30 PM"),
        ("Group 14", "F 01:30 PM - 04:30 PM"),
    ],
    "GE-STS": [
        ("Group 1", "TTh 09:00 AM - 10:30 AM"),
        ("Group 2", "MW 10:30 AM - 12:00 PM"),
        ("Group 4", "TTh 10:30 AM - 12:00 PM"),
        ("Group 5", "TTh 03:00 PM - 04:30 PM"),
        ("Group 6", "MW 09:00 AM - 10:30 AM"),
        ("Group 7", "MW 09:00 AM - 10:30 AM"),
        ("Group 8", "MW 03:00 PM - 04:30 PM"),
        ("Group 9", "TTh 07:30 AM - 09:00 AM"),
        ("Group 10", "TTh 07:30 AM - 09:00 AM"),
        ("Group 11", "TTh 07:30 AM - 09:00 AM"),
        ("Group 12", "MW 06:00 PM - 07:30 PM"),
        ("Group 13", "MW 07:30 AM - 09:00 AM"),
        ("Group 14", "MW 04:30 PM - 06:00 PM"),
        ("Group 15", "MW 01:30 PM - 03:00 PM"),
        ("Group 16", "MW 03:00 PM - 04:30 PM"),
        # EXCLUDED: Group 17 (DISSOLVED)
        ("Group 18", "TTh 10:30 AM - 12:00 PM"),
        ("Group 19", "TTh 03:00 PM - 04:30 PM"),
        ("Group 20", "MW 01:30 PM - 03:00 PM"),
        ("Group 23", "MW 10:30 AM - 12:00 PM"),
        ("Group 25", "MW 04:30 PM - 06:00 PM"),
        ("Group 26", "MW 07:30 AM - 09:00 AM"),
        ("Group 27", "TTh 03:00 PM - 04:30 PM"),
        ("Group 28", "MW 10:30 AM - 12:00 PM"),
        ("Group 29", "MW 04:30 PM - 06:00 PM"),
        ("Group 30", "TTh 12:00 PM - 01:30 PM"),
        ("Group 31", "MW 09:00 AM - 10:30 AM"),
        ("Group 32", "MW 07:30 AM - 09:00 AM"),
        ("Group 33", "MW 07:30 AM - 09:00 AM"),
        ("Group 34", "TTh 04:30 PM - 06:00 PM"),
        ("Group 35", "TTh 06:00 PM - 07:30 PM"),
        ("Group 36", "MW 06:00 PM - 07:30 PM"),
        ("Group 37", "TTh 01:30 PM - 03:00 PM"),
        ("Group 38", "TTh 03:00 PM - 04:30 PM"),
        ("Group 39", "MW 03:00 PM - 04:30 PM"),
        # EXCLUDED: Group 40 (DISSOLVED)
        ("Group 42", "MW 04:30 PM - 06:00 PM"),
        # EXCLUDED: Group 44 (DISSOLVED)
        ("Group 45", "TTh 04:30 PM - 06:00 PM"),
        ("Group 46", "TTh 09:00 AM - 10:30 AM"),
        ("Group 48", "MW 09:00 AM - 10:30 AM"),
        # EXCLUDED: Group 50 (DISSOLVED)
        ("Group 51", "MW 12:00 PM - 01:30 PM"),
        ("Group 52", "TTh 12:00 PM - 01:30 PM"),
        # EXCLUDED: Group 53 (DISSOLVED)
        # EXCLUDED: Group 54 (DISSOLVED)
        ("Group 55", "MW 12:00 PM - 01:30 PM"),
        # EXCLUDED: Group 57 (DISSOLVED)
        # EXCLUDED: Group 58 (DISSOLVED)
        ("Group 59", "TTh 04:30 PM - 06:00 PM"),
    ],
    "CS 4201N": [
        # EXCLUDED: Group 1 (DISSOLVED)
        ("Group 2", "Sat 07:30 AM - 10:30 AM"),
        # EXCLUDED: Group 3 (DISSOLVED)
        ("Group 4", "Sat 07:30 AM - 10:30 AM"),
        ("Group 5", "Sat 09:00 AM - 12:00 PM"),
        ("Group 6", "Sat 01:30 PM - 04:30 PM"),
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
print("PERMUTATION ANALYSIS - NO DISSOLVED COURSES")
print("=" * 80)

courses = build_courses_dict(sample_data)

# Show count per course
print("\nCourse sections (non-dissolved only):")
for code in sorted(courses.keys()):
    print(f"  {code:12} :  {len(courses[code]):2d} sections")

# Calculate raw permutations (no conflict filtering)
raw_total = 1
for code in courses.keys():
    raw_total *= len(courses[code])

print(f"\nRaw permutations (if no conflicts): {raw_total:,}")

# Generate actual valid combinations
print(f"\n{'='*80}")
print(f"Generating valid combinations (with conflict filtering)...")
print(f"{'='*80}\n")

combos = generate_schedule_combinations(courses, max_combinations=100000, debug=True)

print(f"\n{'='*80}")
print(f"✓ TOTAL VALID PERMUTATIONS: {len(combos):,}")
print(f"{'='*80}")

# Analysis by course
print("\nBreakdown of which sections appear in combinations:")
for code in sorted(courses.keys()):
    sections_used = {}
    for combo in combos:
        for course in combo:
            if code in course["code"]:
                group = course["code"].split(" - ")[1]
                sections_used[group] = sections_used.get(group, 0) + 1
    
    print(f"\n{code} ({len(sections_used)} of {len(courses[code])} sections used):")
    for group in sorted(sections_used.keys(), key=lambda x: int(x.split()[-1])):
        sched = next(c[1] for c in sample_data[code] if c[0] == group)
        count = sections_used[group]
        print(f"  {group:10s}: appears in {count:5d} combinations | {sched}")
    
    unused = set(g[0] for g in sample_data[code]) - set(sections_used.keys())
    if unused:
        print(f"\n  ⚠️ Unused sections: {sorted(unused)}")
        for unused_group in sorted(unused):
            sched = next(c[1] for c in sample_data[code] if c[0] == unused_group)
            print(f"     {unused_group}: {sched}")

# Show some example combinations
print(f"\n{'='*80}")
print("Sample valid combinations:")
print(f"{'='*80}")

for idx, combo in enumerate(combos[:10], 1):
    print(f"\n#{idx}:")
    for course in sorted(combo, key=lambda x: x["code"]):
        code = course["code"].split(" - ")[0]
        group = course["code"].split(" - ")[1]
        sched = course["schedule"]
        print(f"  {code:12} {group:10s} | {sched}")

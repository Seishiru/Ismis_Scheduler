#!/usr/bin/env python
"""Test permutation generation with your sample data"""
import sys
sys.path.insert(0, '/Users/rapha/OneDrive/Desktop/Personal/Projects/ISMIS_Scheduler/backend')

from ismis_scheduler import generate_schedule_combinations, parse_schedule, schedules_conflict

# Your sample data
sample_data = {
    "CIS 2106N": [
        ("Group 1", "Sat 07:30 AM - 10:30 AM"),
        ("Group 2", "Sat 07:30 AM - 10:30 AM"),
        ("Group 3", "Sat 10:30 AM - 01:30 PM"),
        ("Group 4", "Sat 10:30 AM - 01:30 PM"),
        ("Group 5", "Sat 07:30 AM - 10:30 AM"),
        ("Group 6", "Sat 07:30 AM - 10:30 AM"),
        ("Group 7", "Sat 10:30 AM - 01:30 PM"),
        ("Group 8", "Sat 10:30 AM - 01:30 PM"),
        ("Group 9", "F 10:30 AM - 01:30 PM"),
        ("Group 10", "F 10:30 AM - 01:30 PM"),
        ("Group 11", "F 07:30 AM - 10:30 AM"),
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
    ],
    "IS 5101N": [
        ("Group 1", "F 03:00 PM - 08:00 PM"),
        ("Group 2", "F 03:00 PM - 08:00 PM"),
        ("Group 3", "Sat 07:30 AM - 12:30 PM"),
    ]
}

# Convert to format expected by generate_schedule_combinations
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
print("TEST 1: CIS 2106N + GE-STS (should include Friday CIS 2106N groups)")
print("=" * 80)

# Test 1: CIS 2106N + GE-STS
test1_data = {
    "CIS 2106N": sample_data["CIS 2106N"],
    "GE-STS": sample_data["GE-STS"]
}

courses1 = build_courses_dict(test1_data)
print("\nCIS 2106N sections:")
for c in courses1["CIS 2106N"]:
    sched = c["schedule"]
    is_friday = "F" in sched
    marker = "🔵 FRIDAY" if is_friday else ""
    print(f"  {c['code']:25s} | {sched:25s} {marker}")

print("\nGE-STS sections (sample):")
for c in courses1["GE-STS"][:5]:
    print(f"  {c['code']:25s} | {c['schedule']:25s}")

print("\nGenerating permutations...")
combos1 = generate_schedule_combinations(courses1, max_combinations=500)

print(f"\n✓ Generated {len(combos1)} valid combinations")

# Analyze which CIS 2106N sections appear
used_cis = {}
for combo in combos1:
    for course in combo:
        if "CIS 2106N" in course["code"]:
            group = course["code"].split(" - ")[1]
            used_cis[group] = used_cis.get(group, 0) + 1

print(f"\nCIS 2106N sections used in combinations:")
for group in sorted(used_cis.keys()):
    is_friday = any("F" in g[1] for g in sample_data["CIS 2106N"] if g[0] == group)
    marker = "🔵 FRIDAY" if is_friday else ""
    print(f"  {group:10s}: {used_cis[group]:4d} times {marker}")

# Check which Friday groups did NOT appear
friday_groups = {g[0] for g in sample_data["CIS 2106N"] if "F" in g[1]}
unused_friday = friday_groups - set(used_cis.keys())
if unused_friday:
    print(f"\n⚠️ UNUSED FRIDAY GROUPS: {sorted(unused_friday)}")
else:
    print(f"\n✓ All Friday groups appear in combinations!")

print("\n" + "=" * 80)
print("TEST 2: CIS 2106N + IS 5101N (both have Friday schedules)")
print("=" * 80)

# Test 2: CIS 2106N + IS 5101N - this might have real conflicts
test2_data = {
    "CIS 2106N": sample_data["CIS 2106N"],
    "IS 5101N": sample_data["IS 5101N"]
}

courses2 = build_courses_dict(test2_data)
print("\nCIS 2106N Friday sections:")
for c in courses2["CIS 2106N"]:
    sched = c["schedule"]
    if "F" in sched:
        print(f"  {c['code']:25s} | {sched}")

print("\nIS 5101N Friday sections:")
for c in courses2["IS 5101N"]:
    sched = c["schedule"]
    if "F" in sched:
        print(f"  {c['code']:25s} | {sched}")

print("\nGenerating permutations...")
combos2 = generate_schedule_combinations(courses2, max_combinations=500)

print(f"\n✓ Generated {len(combos2)} valid combinations")

# Show some example combinations
print("\nFirst 5 combinations:")
for idx, combo in enumerate(combos2[:5], 1):
    print(f"\n  Combo {idx}:")
    for course in combo:
        sched = course["schedule"]
        marker = ""
        if "CIS 2106N" in course["code"] and "F" in sched:
            marker = " 🔵 FRIDAY"
        elif "IS 5101N" in course["code"] and "F" in sched:
            marker = " 🟢 FRIDAY"
        print(f"    {course['code']:25s} | {sched}{marker}")

# Analyze Saturday conflict
print("\n" + "=" * 80)
print("ANALYSIS: Checking for schedule conflicts")
print("=" * 80)

cis_sat_schedules = [c["schedule"] for c in courses2["CIS 2106N"] if "Sat" in c["schedule"]]
is5_sat_schedules = [c["schedule"] for c in courses2["IS 5101N"] if "Sat" in c["schedule"]]

print(f"\nCIS 2106N has {len(cis_sat_schedules)} Saturday sections:")
if cis_sat_schedules:
    print(f"  Sample: {cis_sat_schedules[0]}")

print(f"\nIS 5101N has {len(is5_sat_schedules)} Saturday section:")
if is5_sat_schedules:
    print(f"  {is5_sat_schedules[0]}")

if cis_sat_schedules and is5_sat_schedules:
    # Check if Saturday times conflict
    cis_parsed = parse_schedule(cis_sat_schedules[0])
    is5_parsed = parse_schedule(is5_sat_schedules[0])
    
    print(f"\nCIS parsed: {cis_parsed}")
    print(f"IS5 parsed: {is5_parsed}")
    
    has_conflict = schedules_conflict(cis_parsed, is5_parsed)
    print(f"\nConflict? {has_conflict}")
    
    if has_conflict:
        print("\n⚠️ EXPLANATION: Saturday sections conflict, so only Friday sections appear")
        print("This is CORRECT behavior!")

print("\n" + "=" * 80)

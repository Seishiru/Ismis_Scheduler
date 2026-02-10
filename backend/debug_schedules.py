#!/usr/bin/env python
"""
Debug schedule generation to see why Friday options might be missing
"""
import json
import os
from ismis_scheduler import generate_schedule_combinations, parse_schedule, schedules_conflict

# Load the courses file manually
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
GENERATED_DIR = os.path.join(PROJECT_ROOT, "generated")
JSON_DIR = os.path.join(GENERATED_DIR, "json")

def load_courses(filename="courses.json"):
    """Load courses from JSON"""
    filepath = os.path.join(JSON_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        # Handle both list and dict with 'value' key
        if isinstance(data, list):
            return data
        return data.get('value', [])

def main():
    courses = load_courses()
    if not courses:
        return
    
    print(f"Loaded {len(courses)} total course sections\n")
    
    # Find all unique course codes
    codes_dict = {}
    for course in courses:
        status = course.get('status', '').upper()
        if status == "DISSOLVED":
            continue
        
        code = course.get('code', '').split(' - Group')[0]
        if code not in codes_dict:
            codes_dict[code] = []
        codes_dict[code].append(course)
    
    print(f"Found {len(codes_dict)} unique course codes (excluding DISSOLVED)\n")
    
    # Pick first few courses to test
    test_codes = list(codes_dict.keys())[:3]
    
    for code in test_codes:
        sections = codes_dict[code]
        print(f"\n{'='*70}")
        print(f"Course: {code}")
        print(f"{'='*70}")
        print(f"Total sections: {len(sections)}\n")
        
        for i, section in enumerate(sections, 1):
            sched = section.get('schedule', 'TBA')
            status = section.get('status', 'UNKNOWN')
            enrolled = section.get('enrolled', '?/?')
            parsed = parse_schedule(sched)
            group = section.get('code', '').split(' - ')[-1]
            
            print(f"[{i:2d}] {group:10s} | {sched:25s} | Status: {status:15s}")
            if parsed:
                print(f"     Parsed: days={parsed.get('days')}, start={parsed.get('start')} min, end={parsed.get('end')} min")
            else:
                print(f"     WARNING: Failed to parse schedule!")
    
    # Now try generating combinations with first 2 courses
    if len(test_codes) >= 2:
        print(f"\n\n{'='*70}")
        print(f"Testing permutation generation with {test_codes[0]} and {test_codes[1]}")
        print(f"{'='*70}\n")
        
        selected = {
            test_codes[0]: codes_dict[test_codes[0]],
            test_codes[1]: codes_dict[test_codes[1]]
        }
        
        print(f"Will try all combinations of:")
        print(f"  - {test_codes[0]}: {len(selected[test_codes[0]])} sections")
        print(f"  - {test_codes[1]}: {len(selected[test_codes[1]])} sections")
        print(f"  Total possible: {len(selected[test_codes[0]])} x {len(selected[test_codes[1]])} = {len(selected[test_codes[0]]) * len(selected[test_codes[1]])}")
        print()
        
        combinations = generate_schedule_combinations(selected, max_combinations=1000)
        
        print(f"\nGenerated {len(combinations)} valid combinations\n")
        
        # Show which sections were used
        used_sections_0 = set()
        used_sections_1 = set()
        
        for combo in combinations:
            for course in combo:
                code = course.get('code', '').split(' - Group')[0]
                group = course.get('code', '').split(' - ')[-1]
                if code == test_codes[0]:
                    used_sections_0.add(group)
                else:
                    used_sections_1.add(group)
        
        print(f"Sections of {test_codes[0]} that appear in combinations: {sorted(used_sections_0)}")
        print(f"Sections of {test_codes[1]} that appear in combinations: {sorted(used_sections_1)}")
        
        unused_0 = set()
        for i, section in enumerate(codes_dict[test_codes[0]], 1):
            group = section.get('code', '').split(' - ')[-1]
            if group not in used_sections_0:
                unused_0.add(group)
        
        if unused_0:
            print(f"\nSections of {test_codes[0]} NOT USED: {sorted(unused_0)}")
            print("\nDetails of unused sections:")
            for i, section in enumerate(codes_dict[test_codes[0]], 1):
                group = section.get('code', '').split(' - ')[-1]
                if group in unused_0:
                    sched = section.get('schedule', 'TBA')
                    print(f"  {group}: {sched}")

if __name__ == "__main__":
    main()

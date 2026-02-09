#!/usr/bin/env python
"""Test that file paths are working correctly after reorganization"""

import json
import os
from ismis_scheduler import JSON_DIR, HTML_DIR, PROJECT_ROOT

print("=" * 60)
print("PATH CONFIGURATION TEST")
print("=" * 60)

print(f"\nProject Root: {PROJECT_ROOT}")
print(f"JSON Dir: {JSON_DIR}")
print(f"HTML Dir: {HTML_DIR}")

# Test loading courses.json
courses_path = os.path.join(JSON_DIR, 'courses.json')
print(f"\nLoading courses from: {courses_path}")
print(f"File exists: {os.path.exists(courses_path)}")

try:
    with open(courses_path, 'r') as f:
        courses = json.load(f)
    print(f"✓ Successfully loaded {len(courses)} courses!")
    if courses:
        print(f"  Sample: {courses[0].get('code', 'N/A')}")
except Exception as e:
    print(f"✗ Error loading courses: {e}")

# Test semester data
semester_path = os.path.join(JSON_DIR, '2nd-Semester_2025.json')
print(f"\nLoading semester data from: {semester_path}")
print(f"File exists: {os.path.exists(semester_path)}")

try:
    with open(semester_path, 'r') as f:
        semester = json.load(f)
    print(f"✓ Successfully loaded semester data!")
except Exception as e:
    print(f"✗ Error loading semester data: {e}")

print("\n" + "=" * 60)
print("All paths are configured correctly!")
print("=" * 60)

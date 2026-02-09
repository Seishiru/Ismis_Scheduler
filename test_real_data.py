"""
Quick test for Schedule Generator with real course data
"""
import json
from ismis_scheduler import parse_schedule, check_slot_availability

# Load real courses
with open('courses.json', 'r') as f:
    courses = json.load(f)

print("=" * 60)
print("TESTING PARSE_SCHEDULE WITH REAL COURSE DATA")
print("=" * 60)
print(f"Total courses in JSON: {len(courses)}")
print()

# Test parsing on first 10 courses
parsed_count = 0
failed_count = 0
dissolved_count = 0

print(f"Testing all {len(courses)} courses:")
print("-" * 60)

for i, course in enumerate(courses, 1):
    code = course.get('code', 'Unknown')
    status = course.get('status', 'Unknown')
    schedule = course.get('schedule', 'TBA')
    
    print(f"\n[{i}] {code}")
    print(f"  Status: {status}")
    print(f"  Raw Schedule: '{schedule}'")
    
    if status == "DISSOLVED":
        print(f"  → DISSOLVED - skipped")
        dissolved_count += 1
        continue
    
    result = parse_schedule(schedule)
    if result:
        days = ''.join(result['days'])
        start_h = result['start'] // 60
        start_m = result['start'] % 60
        end_h = result['end'] // 60
        end_m = result['end'] % 60
        print(f"  ✓ Parsed: {days} {start_h:02d}:{start_m:02d}-{end_h:02d}:{end_m:02d}")
        parsed_count += 1
    else:
        print(f"  ❌ Failed to parse")
        failed_count += 1

print()
print("=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"✓ Successfully parsed: {parsed_count}")
print(f"❌ Failed to parse: {failed_count}")
print(f"⏭ Dissolved courses: {dissolved_count}")
if parsed_count + failed_count > 0:
    print(f"📊 Parse rate: {parsed_count}/{parsed_count + failed_count} = {parsed_count/(parsed_count + failed_count)*100:.1f}%")


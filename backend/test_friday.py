#!/usr/bin/env python
"""Test to check Friday classes in courses"""
import json
from ismis_scheduler import parse_schedule

# Load courses
with open('../generated/json/courses.json') as f:
    courses = json.load(f)

codes = {}
for c in courses:
    if c.get('status') == 'DISSOLVED':
        continue
    code = c.get('code', '').split(' - ')[0]
    if code not in codes:
        codes[code] = []
    codes[code].append(c)

print('Available course codes:')
for code in codes:
    print(f'  {code}: {len(codes[code])} sections')

# Show all Friday sections
print('\n' + '='*70)
print('Friday sections by course:')
print('='*70)

for code in codes:
    friday_secs = []
    for c in codes[code]:
        sched = c.get('schedule', 'TBA')
        if 'F' in sched:
            group = c['code'].split(' - ')[-1]
            friday_secs.append((group, sched))
    if friday_secs:
        print(f'\n{code}: {len(friday_secs)} Friday sections')
        for group, sched in friday_secs:
            print(f'  {group}: {sched}')

print('\n' + '='*70)
print('Non-Friday sections:')
print('='*70)

for code in codes:
    non_friday = []
    for c in codes[code]:
        sched = c.get('schedule', 'TBA')
        if 'F' not in sched:
            group = c['code'].split(' - ')[-1]
            non_friday.append((group, sched))
    if non_friday:
        print(f'\n{code}: {len(non_friday)} non-Friday sections')
        for group, sched in non_friday[:3]:  # Show first 3
            print(f'  {group}: {sched}')
        if len(non_friday) > 3:
            print(f'  ... and {len(non_friday) - 3} more')

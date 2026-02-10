"""
Calculate valid schedule permutations from course section data.

Question: How many possible schedule permutations can be formed using only 
non-dissolved sections, assuming no time conflicts, where each schedule 
includes exactly one section from each unique course?
"""

from itertools import product
from typing import List, Dict, Tuple

# Parse schedule string to extract days and time range
def parse_schedule(schedule_str: str) -> Dict:
    """Parse schedule like 'Sat 07:30 AM - 10:30 AM' into structured data"""
    if not schedule_str or schedule_str == 'N/A':
        return None
    
    parts = schedule_str.split()
    if len(parts) < 5:
        return None
    
    # Extract day(s)
    day_part = parts[0]
    days = []
    
    # Map day abbreviations
    day_map = {
        'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday',
        'Th': 'Thursday', 'F': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
    }
    
    if day_part == 'Sat' or day_part == 'Sun':
        days = [day_part]
    elif day_part == 'MW':
        days = ['M', 'W']
    elif day_part == 'TTh':
        days = ['T', 'Th']
    elif day_part in ['M', 'T', 'W', 'Th', 'F']:
        days = [day_part]
    else:
        # Try to parse complex patterns
        days = [day_part]
    
    # Extract time
    try:
        start_time_str = f"{parts[1]} {parts[2]}"  # "07:30 AM"
        end_time_str = f"{parts[4]} {parts[5]}"    # "10:30 AM"
        
        # Convert to minutes since midnight
        def time_to_minutes(time_str: str) -> int:
            time_part, period = time_str.split()
            hours, minutes = map(int, time_part.split(':'))
            if period == 'PM' and hours != 12:
                hours += 12
            elif period == 'AM' and hours == 12:
                hours = 0
            return hours * 60 + minutes
        
        start_min = time_to_minutes(start_time_str)
        end_min = time_to_minutes(end_time_str)
        
        return {
            'days': days,
            'start': start_min,
            'end': end_min
        }
    except:
        return None


def schedules_conflict(sched1: Dict, sched2: Dict) -> bool:
    """Check if two schedules have time conflicts"""
    if not sched1 or not sched2:
        return False
    
    # Check if they share any common days
    common_days = set(sched1['days']) & set(sched2['days'])
    if not common_days:
        return False
    
    # Check for time overlap on common days
    # Two time ranges overlap if: start1 < end2 AND start2 < end1
    return sched1['start'] < sched2['end'] and sched2['start'] < sched1['end']


def has_schedule_conflict(sections: List[Dict]) -> bool:
    """Check if a combination of sections has any time conflicts"""
    schedules = [s['schedule'] for s in sections if s['schedule']]
    
    for i in range(len(schedules)):
        for j in range(i + 1, len(schedules)):
            if schedules_conflict(schedules[i], schedules[j]):
                return True
    
    return False


# Course data
course_data = {
    'CIS 2106N': [
        {'group': 'Group 1', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 07:30 AM - 10:30 AM'},
        {'group': 'Group 2', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 07:30 AM - 10:30 AM'},
        {'group': 'Group 3', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 10:30 AM - 01:30 PM'},
        {'group': 'Group 4', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 10:30 AM - 01:30 PM'},
        {'group': 'Group 5', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 07:30 AM - 10:30 AM'},
        {'group': 'Group 6', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 07:30 AM - 10:30 AM'},
        {'group': 'Group 7', 'status': 'DISSOLVED', 'schedule_str': 'Sat 10:30 AM - 01:30 PM'},
        {'group': 'Group 8', 'status': 'DISSOLVED', 'schedule_str': 'Sat 10:30 AM - 01:30 PM'},
        {'group': 'Group 9', 'status': 'BLOCKSECTION', 'schedule_str': 'F 10:30 AM - 01:30 PM'},
        {'group': 'Group 10', 'status': 'BLOCKSECTION', 'schedule_str': 'F 10:30 AM - 01:30 PM'},
        {'group': 'Group 11', 'status': 'DISSOLVED', 'schedule_str': 'F 07:30 AM - 10:30 AM'},
        {'group': 'Group 12', 'status': 'BLOCKSECTION', 'schedule_str': 'F 07:30 AM - 10:30 AM'},
        {'group': 'Group 13', 'status': 'BLOCKSECTION', 'schedule_str': 'F 01:30 PM - 04:30 PM'},
        {'group': 'Group 14', 'status': 'BLOCKSECTION', 'schedule_str': 'F 01:30 PM - 04:30 PM'},
    ],
    'GE-STS': [
        {'group': 'Group 1', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 09:00 AM - 10:30 AM'},
        {'group': 'Group 2', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 10:30 AM - 12:00 PM'},
        {'group': 'Group 4', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 10:30 AM - 12:00 PM'},
        {'group': 'Group 5', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 03:00 PM - 04:30 PM'},
        {'group': 'Group 6', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 09:00 AM - 10:30 AM'},
        {'group': 'Group 7', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 09:00 AM - 10:30 AM'},
        {'group': 'Group 8', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 03:00 PM - 04:30 PM'},
        {'group': 'Group 9', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 07:30 AM - 09:00 AM'},
        {'group': 'Group 10', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 07:30 AM - 09:00 AM'},
        {'group': 'Group 11', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 07:30 AM - 09:00 AM'},
        {'group': 'Group 12', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 06:00 PM - 07:30 PM'},
        {'group': 'Group 13', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 07:30 AM - 09:00 AM'},
        {'group': 'Group 14', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 04:30 PM - 06:00 PM'},
        {'group': 'Group 15', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 01:30 PM - 03:00 PM'},
        {'group': 'Group 16', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 03:00 PM - 04:30 PM'},
        {'group': 'Group 17', 'status': 'DISSOLVED', 'schedule_str': 'TTh 09:00 AM - 10:30 AM'},
        {'group': 'Group 18', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 10:30 AM - 12:00 PM'},
        {'group': 'Group 19', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 03:00 PM - 04:30 PM'},
        {'group': 'Group 20', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 01:30 PM - 03:00 PM'},
        {'group': 'Group 23', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 10:30 AM - 12:00 PM'},
        {'group': 'Group 25', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 04:30 PM - 06:00 PM'},
        {'group': 'Group 26', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 07:30 AM - 09:00 AM'},
        {'group': 'Group 27', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 03:00 PM - 04:30 PM'},
        {'group': 'Group 28', 'status': 'REGULAR', 'schedule_str': 'MW 10:30 AM - 12:00 PM'},
        {'group': 'Group 29', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 04:30 PM - 06:00 PM'},
        {'group': 'Group 30', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 12:00 PM - 01:30 PM'},
        {'group': 'Group 31', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 09:00 AM - 10:30 AM'},
        {'group': 'Group 32', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 07:30 AM - 09:00 AM'},
        {'group': 'Group 33', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 07:30 AM - 09:00 AM'},
        {'group': 'Group 34', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 04:30 PM - 06:00 PM'},
        {'group': 'Group 35', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 06:00 PM - 07:30 PM'},
        {'group': 'Group 36', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 06:00 PM - 07:30 PM'},
        {'group': 'Group 37', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 01:30 PM - 03:00 PM'},
        {'group': 'Group 38', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 03:00 PM - 04:30 PM'},
        {'group': 'Group 39', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 03:00 PM - 04:30 PM'},
        {'group': 'Group 40', 'status': 'DISSOLVED', 'schedule_str': 'MW 04:30 PM - 06:00 PM'},
        {'group': 'Group 42', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 04:30 PM - 06:00 PM'},
        {'group': 'Group 44', 'status': 'DISSOLVED', 'schedule_str': 'TTh 06:00 PM - 07:30 PM'},
        {'group': 'Group 45', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 04:30 PM - 06:00 PM'},
        {'group': 'Group 46', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 09:00 AM - 10:30 AM'},
        {'group': 'Group 48', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 09:00 AM - 10:30 AM'},
        {'group': 'Group 50', 'status': 'DISSOLVED', 'schedule_str': 'TTh 04:30 PM - 06:00 PM'},
        {'group': 'Group 51', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 12:00 PM - 01:30 PM'},
        {'group': 'Group 52', 'status': 'BLOCKSECTION', 'schedule_str': 'TTh 12:00 PM - 01:30 PM'},
        {'group': 'Group 53', 'status': 'DISSOLVED', 'schedule_str': 'TTh 07:30 AM - 09:00 AM'},
        {'group': 'Group 54', 'status': 'DISSOLVED', 'schedule_str': 'MW 09:00 AM - 10:30 AM'},
        {'group': 'Group 55', 'status': 'BLOCKSECTION', 'schedule_str': 'MW 12:00 PM - 01:30 PM'},
        {'group': 'Group 57', 'status': 'DISSOLVED', 'schedule_str': 'MW 01:30 PM - 03:00 PM'},
        {'group': 'Group 58', 'status': 'DISSOLVED', 'schedule_str': 'MW 09:00 AM - 10:30 AM'},
        {'group': 'Group 59', 'status': 'REGULAR', 'schedule_str': 'TTh 04:30 PM - 06:00 PM'},
    ],
    'CS 4201N': [
        {'group': 'Group 1', 'status': 'DISSOLVED', 'schedule_str': 'Sat 10:30 AM - 01:30 PM'},
        {'group': 'Group 2', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 07:30 AM - 10:30 AM'},
        {'group': 'Group 3', 'status': 'DISSOLVED', 'schedule_str': 'Sat 01:30 PM - 04:30 PM'},
        {'group': 'Group 4', 'status': 'REGULAR', 'schedule_str': 'Sat 07:30 AM - 10:30 AM'},
        {'group': 'Group 5', 'status': 'BLOCKSECTION', 'schedule_str': 'Sat 09:00 AM - 12:00 PM'},
        {'group': 'Group 6', 'status': 'REGULAR', 'schedule_str': 'Sat 01:30 PM - 04:30 PM'},
    ],
    'IS 5101N': [
        {'group': 'Group 1', 'status': 'REGULAR', 'schedule_str': 'F 03:00 PM - 08:00 PM'},
        {'group': 'Group 2', 'status': 'REGULAR', 'schedule_str': 'F 03:00 PM - 08:00 PM'},
        {'group': 'Group 3', 'status': 'REGULAR', 'schedule_str': 'Sat 07:30 AM - 12:30 PM'},
    ]
}


def main():
    print("=" * 80)
    print("SCHEDULE PERMUTATION SIMULATION")
    print("=" * 80)
    print("\nQuestion: How many possible schedule permutations can be formed using")
    print("only non-dissolved sections, assuming no time conflicts, where each")
    print("schedule includes exactly one section from each unique course?")
    print("\n" + "=" * 80)
    
    # Filter non-dissolved sections and parse schedules
    filtered_courses = {}
    
    for course_code, sections in course_data.items():
        non_dissolved = []
        for section in sections:
            if section['status'] != 'DISSOLVED':
                schedule = parse_schedule(section['schedule_str'])
                non_dissolved.append({
                    'course': course_code,
                    'group': section['group'],
                    'status': section['status'],
                    'schedule_str': section['schedule_str'],
                    'schedule': schedule
                })
        filtered_courses[course_code] = non_dissolved
    
    # Display filtered sections
    print("\nNON-DISSOLVED SECTIONS BY COURSE:")
    print("-" * 80)
    for course_code, sections in filtered_courses.items():
        print(f"\n{course_code}: {len(sections)} sections")
        for section in sections:
            print(f"  - {section['group']}: {section['schedule_str']}")
    
    # Calculate raw permutations (without conflict checking)
    section_counts = [len(sections) for sections in filtered_courses.values()]
    raw_permutations = 1
    for count in section_counts:
        raw_permutations *= count
    
    print("\n" + "=" * 80)
    print(f"RAW PERMUTATIONS (if no conflicts): {raw_permutations:,}")
    print("=" * 80)
    
    # Generate all combinations and check for conflicts
    print("\nGenerating valid permutations (no time conflicts)...")
    
    course_codes = list(filtered_courses.keys())
    section_lists = [filtered_courses[code] for code in course_codes]
    
    valid_permutations = []
    total_checked = 0
    conflicts_found = 0
    
    for combination in product(*section_lists):
        total_checked += 1
        
        if not has_schedule_conflict(list(combination)):
            valid_permutations.append(combination)
        else:
            conflicts_found += 1
    
    print(f"\nTotal combinations checked: {total_checked:,}")
    print(f"Combinations with conflicts: {conflicts_found:,}")
    
    print("\n" + "=" * 80)
    print("FINAL ANSWER")
    print("=" * 80)
    print(f"\nValid schedule permutations: {len(valid_permutations):,}")
    print("\n" + "=" * 80)
    
    # Show some examples
    print("\nSAMPLE VALID SCHEDULES (first 5):")
    print("-" * 80)
    for i, combo in enumerate(valid_permutations[:5], 1):
        print(f"\nSchedule {i}:")
        for section in combo:
            print(f"  {section['course']} - {section['group']}: {section['schedule_str']}")
    
    # Show breakdown by course composition
    print("\n" + "=" * 80)
    print("SECTION USAGE STATISTICS")
    print("=" * 80)
    
    for course_code in course_codes:
        section_usage = {}
        for combo in valid_permutations:
            for section in combo:
                if section['course'] == course_code:
                    group = section['group']
                    section_usage[group] = section_usage.get(group, 0) + 1
        
        print(f"\n{course_code}:")
        for group in sorted(section_usage.keys()):
            count = section_usage[group]
            percentage = (count / len(valid_permutations)) * 100
            print(f"  {group}: appears in {count:,} schedules ({percentage:.1f}%)")


if __name__ == "__main__":
    main()

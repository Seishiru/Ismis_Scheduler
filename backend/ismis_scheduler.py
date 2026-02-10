 # ============================================================================
# USC ISMIS Course Schedule Scraper
# ============================================================================

from playwright.sync_api import sync_playwright, Page, expect
import re
import json
import time
import random
import os


# ============================================================================
# PATH CONFIGURATION
# ============================================================================

# Get the script's directory and construct paths relative to it
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # Parent directory (ISMIS_Scheduler)
GENERATED_DIR = os.path.join(PROJECT_ROOT, "generated")
JSON_DIR = os.path.join(GENERATED_DIR, "json")
HTML_DIR = os.path.join(GENERATED_DIR, "html")


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

POLITE_MIN_DELAY = 0.4
POLITE_MAX_DELAY = 0.9


def polite_pause(min_s=POLITE_MIN_DELAY, max_s=POLITE_MAX_DELAY):
    """
    Adds a small random delay to avoid hitting the server too aggressively.
    """
    time.sleep(random.uniform(min_s, max_s))


def setup_page_optimizations(page: Page):
    """
    Speeds up scraping by blocking heavy resources while keeping HTML intact.
    """
    def handle_route(route):
        resource_type = route.request.resource_type
        if resource_type in ("image", "media", "font"):
            route.abort()
        else:
            route.continue_()

    page.route("**/*", handle_route)
    page.set_default_timeout(30000)
    page.set_default_navigation_timeout(45000)


def format_time(seconds):
    """
    Formats seconds into a readable time string.
    """
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins}m {secs}s"
    else:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        return f"{hours}h {mins}m"


def show_progress(current, total, prefix="Progress", bar_length=40):
    """
    Displays a progress bar in the console.
    """
    percent = current / total
    filled = int(bar_length * percent)
    bar = '█' * filled + '-' * (bar_length - filled)
    print(f"\r{prefix}: |{bar}| {current}/{total} ({percent*100:.1f}%)", end='', flush=True)
    if current == total:
        print()  # New line when complete


def get_academic_period_choice():
    """
    Displays academic period options and returns the user's choice.
    Returns tuple of (period_value, period_display_name).
    """
    print("\nAcademic Period Options:")
    print("  1 - 1ST Semester")
    print("  2 - 2ND Semester")
    print("  3 - Summer")
    print("  4 - 1ST Trimester")
    print("  5 - 2ND Trimester")
    print("  6 - 3RD Trimester")
    print("  7 - Transition Term")
    
    period_map = {
        "1": "FIRST_SEMESTER",
        "2": "SECOND_SEMESTER",
        "3": "SUMMER",
        "4": "FIRST_TRIMESTER",
        "5": "SECOND_TRIMESTER",
        "6": "THIRD_TRIMESTER",
        "7": "TRANSITION_SEMESTER"
    }
    
    period_display_map = {
        "1": "1st-Semester",
        "2": "2nd-Semester",
        "3": "Summer",
        "4": "1st-Trimester",
        "5": "2nd-Trimester",
        "6": "3rd-Trimester",
        "7": "Transition-Term"
    }
    
    period_choice = input("Select academic period (1-7): ")
    academic_period = period_map.get(period_choice, "SECOND_SEMESTER")
    period_name = period_display_map.get(period_choice, "2nd-Semester")
    
    return academic_period, period_name


# ============================================================================
# SCHEDULE GENERATOR FUNCTIONS
# ============================================================================

def parse_schedule(schedule_str: str, debug: bool = False):
    """
    Parses a schedule string like "MWF 10:00-12:00" or "Sat 07:30 AM - 10:30 AM" into structured data.
    Returns a dict with 'days' (list) and 'time' (tuple) or None if invalid.
    Supports:
    - Abbreviations: M, T, W, R, F, S (Saturday), U (Sunday)
    - Full/3-letter names: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    - TTh pattern (Tuesday-Thursday)
    """
    if not schedule_str or schedule_str.upper() == "TBA":
        return None
    
    schedule_str = schedule_str.strip()
    if debug:
        print(f"[PARSE] Processing: {schedule_str}")
    
    # Mapping from full/3-letter day names to single-letter codes
    day_mapping = {
        "MONDAY": "M", "MON": "M",
        "TUESDAY": "T", "TUE": "T",
        "WEDNESDAY": "W", "WED": "W",
        "THURSDAY": "R", "THU": "R", "TH": "R",  # Added "TH" for "TTh" pattern
        "FRIDAY": "F", "FRI": "F",
        "SATURDAY": "S", "SAT": "S",
        "SUNDAY": "U", "SUN": "U"
    }
    
    # Try matching with single-letter abbreviations first (MWF, TTh, MW, etc.)
    # Pattern includes "h?" to handle "TTh" style and captures AM/PM separately for start and end times
    match = re.match(r"([MTWRFSUmtwrfsu]+h?)\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?", schedule_str, re.IGNORECASE)
    
    if match:
        days_str = match.group(1).upper()
        start_hour = int(match.group(2))
        start_min = int(match.group(3))
        start_ampm = match.group(4)  # AM/PM for start time
        end_hour = int(match.group(5))
        end_min = int(match.group(6))
        end_ampm = match.group(7)  # AM/PM for end time
        
        # Normalize "TTh" or "Tth" to "TR" (Tuesday-Thursday)
        days_str = days_str.replace("TH", "R").replace("H", "")
        
        # Convert to 24-hour format based on AM/PM markers
        if start_ampm and start_ampm.upper() == "PM" and start_hour < 12:
            start_hour += 12
        if end_ampm and end_ampm.upper() == "PM" and end_hour < 12:
            end_hour += 12
        # If no AM/PM specified and hour is low (1-7), assume PM
        elif not start_ampm and not end_ampm:
            if start_hour < 8 and start_hour >= 1:
                start_hour += 12
            if end_hour < 8 and end_hour >= 1:
                end_hour += 12
    else:
        # Try matching with full/3-letter day names (Mon, Tue, Sat, etc.)
        match = re.match(r"([A-Za-z]+)\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?", schedule_str, re.IGNORECASE)
        
        if not match:
            return None
        
        days_input = match.group(1).upper()
        start_hour = int(match.group(2))
        start_min = int(match.group(3))
        start_ampm = match.group(4)  # AM/PM for start time
        end_hour = int(match.group(5))
        end_min = int(match.group(6))
        end_ampm = match.group(7)  # AM/PM for end time
        
        # Convert full day names to single-letter codes
        days_str = ""
        for day_name, day_code in day_mapping.items():
            if days_input.startswith(day_name):
                days_str = day_code
                break
        
        if not days_str:
            return None
        
        # Convert to 24-hour format based on AM/PM markers
        if start_ampm and start_ampm.upper() == "PM" and start_hour < 12:
            start_hour += 12
        if end_ampm and end_ampm.upper() == "PM" and end_hour < 12:
            end_hour += 12
        # If no AM/PM specified and hour is low (1-7), assume PM
        elif not start_ampm and not end_ampm:
            if start_hour < 8 and start_hour >= 1:
                start_hour += 12
            if end_hour < 8 and end_hour >= 1:
                end_hour += 12
    
    # Convert to minutes for easier comparison
    start_minutes = start_hour * 60 + start_min
    end_minutes = end_hour * 60 + end_min
    
    result = {
        "days": list(days_str),
        "start": start_minutes,
        "end": end_minutes
    }
    
    if debug:
        print(f"[PARSE] ✓ Success: {result}")
    
    return result


def is_course_full(course) -> bool:
    """
    Checks if a course is full based on enrolled/capacity.
    Returns True if enrolled >= capacity.
    """
    enrolled_str = course.get("enrolled", "0/0")
    try:
        if '/' in enrolled_str:
            parts = enrolled_str.split('/')
            enrolled = int(parts[0].strip())
            capacity = int(parts[1].strip())
            return enrolled >= capacity
    except (ValueError, IndexError):
        pass
    return False


def get_schedule_status(schedule) -> dict:
    """
    Determines if a schedule is available or unavailable.
    Returns dict with 'status' ('available' or 'unavailable') and 'full_courses' list.
    """
    full_courses = []
    for course in schedule:
        if is_course_full(course):
            full_courses.append(course.get("code", "Unknown"))
    
    status = "unavailable" if full_courses else "available"
    return {
        "status": status,
        "full_courses": full_courses
    }


def schedules_conflict(sched1, sched2) -> bool:
    """
    Checks if two parsed schedules conflict.
    Two schedules conflict if they share ANY day and their times overlap.
    
    Args:
        sched1: Parsed schedule dict with 'days', 'start', 'end' or None
        sched2: Parsed schedule dict with 'days', 'start', 'end' or None
    
    Returns:
        True if they overlap, False otherwise
    """
    # TBA (None) classes don't conflict with anything
    if sched1 is None or sched2 is None:
        return False
    
    # Check if they share any days
    days1 = set(sched1.get("days", []))
    days2 = set(sched2.get("days", []))
    
    if not days1 or not days2:
        return False
    
    shared_days = days1.intersection(days2)
    if not shared_days:
        return False  # No common days, no conflict
    
    # Check if times overlap on shared days
    # Two times conflict if: start1 < end2 AND start2 < end1
    # Note: Using strict < for start comparisons to allow back-to-back classes
    start1 = sched1.get("start", 0)
    end1 = sched1.get("end", 0)
    start2 = sched2.get("start", 0)
    end2 = sched2.get("end", 0)
    
    # Validate times are reasonable (between 0 and 2400 minutes)
    if not all(0 <= t <= 1440 for t in [start1, end1, start2, end2]):
        return False
    
    # Overlap detection: if one class ends when another starts, they don't conflict
    if start1 < end2 and start2 < end1:
        return True
    
    return False


def has_schedule_conflict(schedule: list) -> bool:
    """
    Validates if a schedule combination has any conflicts.
    
    Args:
        schedule: List of course sections
    
    Returns:
        True if any courses conflict, False otherwise
    """
    for i in range(len(schedule)):
        for j in range(i + 1, len(schedule)):
            sched1 = parse_schedule(schedule[i]["schedule"])
            sched2 = parse_schedule(schedule[j]["schedule"])
            if schedules_conflict(sched1, sched2):
                return True
    return False


def generate_schedule_combinations(courses_by_code: dict, max_combinations: int = 1000, debug: bool = False):
    """
    Generates all valid schedule combinations from selected courses.
    Uses backtracking to build permutations and filters out any with time conflicts.
    
    Args:
        courses_by_code: Dict organized as {course_code: [sections]}
        max_combinations: Stop after finding this many valid schedules
        debug: If True, logs detailed rejection info
    
    Returns:
        List of valid schedule combinations with no conflicts
    """
    course_codes = list(courses_by_code.keys())
    valid_schedules = []
    rejected_by_conflict = {code: [] for code in course_codes}
    
    def backtrack(index: int, current_schedule: list):
        """Recursively build valid schedules via permutation."""
        if len(valid_schedules) >= max_combinations:
            return
        
        # Base case: all courses assigned
        if index == len(course_codes):
            # Final validation: ensure no conflicts in the complete schedule
            if not has_schedule_conflict(current_schedule):
                valid_schedules.append(current_schedule[:])
            return
        
        # Try each section of the current course
        course_code = course_codes[index]
        sections = courses_by_code[course_code]
        
        for section in sections:
            parsed_sched = parse_schedule(section["schedule"])
            
            # Check for conflicts with already-scheduled courses
            has_conflict = False
            conflict_info = None
            for scheduled_course in current_schedule:
                sched_to_check = parse_schedule(scheduled_course["schedule"])
                if schedules_conflict(parsed_sched, sched_to_check):
                    has_conflict = True
                    conflict_info = scheduled_course.get("code", "Unknown")
                    break
            
            # If no conflict, add this section and continue building
            if not has_conflict:
                current_schedule.append(section)
                backtrack(index + 1, current_schedule)
                current_schedule.pop()
            else:
                # Track rejections
                section_code = section.get("code", "Unknown")
                rejected_by_conflict[course_code].append({
                    "section": section_code,
                    "schedule": section.get("schedule", "TBA"),
                    "conflicted_with": conflict_info
                })
    
    if debug:
        print(f"\n[BACKTRACK] Attempting to build combinations for {len(course_codes)} courses")
    backtrack(0, [])
    
    if debug:
        print(f"[BACKTRACK] Generated {len(valid_schedules)} valid combinations")
        for code, rejections in rejected_by_conflict.items():
            if rejections:
                print(f"\n[BACKTRACK] {code} had {len(rejections)} sections rejected:")
                for rej in rejections:
                    print(f"  - {rej['section']}: {rej['schedule']} (conflicted with {rej['conflicted_with']})")
    
    return valid_schedules


def generate_schedule_html(combinations: list):
    """
    Generates an HTML calendar view for all schedule combinations.
    Each combination is displayed as a weekly schedule grid.
    """
    if not combinations:
        print("No schedules to visualize.")
        return
    
    # Color palette for courses
    colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
        "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#A9DFBF"
    ]
    
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ISMIS Schedule Visualizer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        button {
            padding: 10px 20px;
            background: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            color: #667eea;
            transition: transform 0.2s;
        }
        
        button:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        button.active {
            background: #667eea;
            color: white;
        }
        
        .schedule-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        }
        
        .schedule-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
        }
        
        .calendar {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .calendar th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        
        .calendar td {
            border: 1px solid #ddd;
            padding: 8px;
            vertical-align: top;
            height: 50px;
            position: relative;
            background: #f9f9f9;
        }
        
        .calendar td:first-child {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
            width: 60px;
        }
        
        .course-block {
            background: #667eea;
            color: white;
            padding: 4px 6px;
            border-radius: 3px;
            font-size: 11px;
            margin: 2px 0;
            word-wrap: break-word;
            border-left: 4px solid;
        }
        
        .course-details {
            display: none;
            background: white;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
        }
        
        .course-details.show {
            display: block;
        }
        
        .course-list {
            list-style: none;
        }
        
        .course-list li {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: grid;
            grid-template-columns: 150px 120px 100px 1fr;
            gap: 15px;
        }
        
        .course-list li:last-child {
            border-bottom: none;
        }
        
        .course-code {
            font-weight: bold;
            color: #667eea;
        }
        
        @media (max-width: 768px) {
            .calendar {
                font-size: 12px;
            }
            
            .course-list li {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📅 ISMIS Schedule Visualizer</h1>
        
        <div class="controls">
            <span style="color: white; font-weight: bold; align-self: center;">Schedule Option:</span>
"""
    
    # Add buttons for each schedule
    for i, combo_dict in enumerate(combinations):
        active_class = "active" if i == 0 else ""
        status = combo_dict["status"]
        status_badge = "✓" if status == "available" else "✗"
        status_color = "#4CAF50" if status == "available" else "#f44336"
        html_content += f'            <button class="{active_class}" data-schedule-index="{i}" onclick="showSchedule({i})" style="position: relative;">Option {i + 1} <span style="color: {status_color}; font-weight: bold; margin-left: 5px;">{status_badge}</span></button>\n'
    
    html_content += """        </div>
"""
    
    # Generate calendar for each schedule
    for sched_idx, combo_dict in enumerate(combinations):
        schedule = combo_dict["courses"]
        status = combo_dict["status"]
        full_courses = combo_dict["full_courses"]
        schedule_html = generate_single_schedule_html(schedule, sched_idx, colors, status, full_courses)
        html_content += schedule_html
    
    html_content += """
    <script>
        function showSchedule(index) {
            // Hide all schedules
            document.querySelectorAll('.schedule-container').forEach(el => {
                el.style.display = 'none';
            });
            
            // Show selected schedule
            const selectedSchedule = document.getElementById('schedule-' + index);
            if (selectedSchedule) {
                selectedSchedule.style.display = 'block';
            }
            
            // Update button states
            document.querySelectorAll('.controls button').forEach((btn) => {
                const btnIndex = parseInt(btn.getAttribute('data-schedule-index'));
                if (btnIndex === index) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        function toggleDetails(index) {
            const details = document.getElementById('details-' + index);
            if (details) {
                details.classList.toggle('show');
            }
        }
    </script>
</body>
</html>"""
    
    # Create generated folder if it doesn't exist
    os.makedirs(HTML_DIR, exist_ok=True)
    
    # Save to file
    filename = os.path.join(HTML_DIR, f"schedule_view_{int(time.time())}.html")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print(f"✓ Calendar view saved to: {filename}")
    
    # Try to open in browser
    try:
        import webbrowser
        webbrowser.open('file://' + os.path.realpath(filename))
    except:
        print(f"Open {filename} in your browser to view the schedule.")


def generate_single_schedule_html(schedule: list, sched_idx: int, colors: list, status: str = "available", full_courses: list = None):
    """
    Generates HTML for a single schedule as a calendar grid with dynamic time slots.
    """
    if full_courses is None:
        full_courses = []
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_abbrev = ['M', 'T', 'W', 'R', 'F', 'S', 'U']
    
    # Parse all courses for this schedule
    course_by_day_time = {}
    course_info = {}
    color_map = {}
    min_time = 24 * 60  # Start with max value
    max_time = 0       # Start with min value
    parsed_courses = 0
    tba_courses = 0
    
    for course_idx, course in enumerate(schedule):
        parsed = parse_schedule(course["schedule"])
        code = course["code"]
        
        if code not in color_map:
            color_map[code] = colors[len(color_map) % len(colors)]
        
        course_info[code] = {
            "teacher": course.get("teacher", "TBA"),
            "room": course.get("room", "TBA"),
            "description": course.get("description", "")
        }
        
        if parsed:
            parsed_courses += 1
            # Track min/max times for dynamic time slots
            if parsed["start"] < min_time:
                min_time = parsed["start"]
            if parsed["end"] > max_time:
                max_time = parsed["end"]
            
            for day in parsed["days"]:
                if day not in day_abbrev:
                    continue
                key = (day, parsed["start"], parsed["end"], code)
                course_by_day_time[key] = {
                    "code": code,
                    "start": parsed["start"],
                    "end": parsed["end"],
                    "color": color_map[code]
                }
        else:
            tba_courses += 1
    
    # Ensure reasonable default time range if no courses
    if min_time == 24 * 60:
        min_time = 7 * 60  # 7 AM
    if max_time == 0:
        max_time = 18 * 60  # 6 PM
    
    # Round down min_time to nearest 30 minutes, round up max_time
    min_time = (min_time // 30) * 30
    max_time = ((max_time + 29) // 30) * 30  # Round up
    
    # Build schedule summary
    has_visible_courses = parsed_courses > 0
    
    # Status badge
    if status == "available":
        status_badge = "✓ AVAILABLE"
        status_color = "#4CAF50"
    else:
        status_badge = "✗ UNAVAILABLE (Full Courses)"
        status_color = "#f44336"
    
    summary_badge = "✓ Scheduled" if has_visible_courses else "⏱ All TBA"
    summary_color = "#4ECDC4" if has_visible_courses else "#FFA07A"
    
    # Build full courses warning if any
    full_courses_warning = ""
    if full_courses:
        full_list = ", ".join(full_courses)
        full_courses_warning = f'''            <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
                <strong style="color: #c62828;">⚠ Warning:</strong> The following course(s) are full: <strong>{full_list}</strong>
            </div>'''
    
    # Build HTML table
    html = f"""        <div class="schedule-container" id="schedule-{sched_idx}" style="display: {'block' if sched_idx == 0 else 'none'};">
            <div class="schedule-title">
                Schedule Option {sched_idx + 1}
                <span style="background: {status_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-left: 10px;">{status_badge}</span>
                <span style="background: {summary_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-left: 10px;">{summary_badge}</span>
            </div>
            <div style="margin-bottom: 15px; font-size: 13px; color: #666;">
                📚 {len(schedule)} courses | ✓ {parsed_courses} scheduled | ⏱ {tba_courses} TBA
            </div>
{full_courses_warning}
            
            <table class="calendar">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Monday</th>
                        <th>Tuesday</th>
                        <th>Wednesday</th>
                        <th>Thursday</th>
                        <th>Friday</th>
                        <th>Saturday</th>
                        <th>Sunday</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    # Generate dynamic time slots in 30-minute increments
    time_slot = min_time
    while time_slot <= max_time:
        hours = time_slot // 60
        minutes = time_slot % 60
        time_str = f"{hours:02d}:{minutes:02d}"
        
        html += f"                    <tr>\n                        <td>{time_str}</td>\n"
        
        for day_abbrev_char in day_abbrev:
            cell_content = ""
            
            # Find courses in this time slot
            for key, data in course_by_day_time.items():
                if key[0] == day_abbrev_char and data["start"] <= time_slot < data["end"]:
                    cell_content = f'<div class="course-block" style="border-left-color: {data["color"]}; background: {data["color"]};">{data["code"]}</div>'
                    break
            
            html += f"                        <td>{cell_content}</td>\n"
        
        html += "                    </tr>\n"
        time_slot += 30  # Move to next 30-minute slot
    
    html += """                </tbody>
            </table>
            
            <button onclick="toggleDetails(""" + str(sched_idx) + """)">📋 View Course Details</button>
            
            <div class="course-details" id="details-""" + str(sched_idx) + """">
                <h3>Course Details:</h3>
                <ul class="course-list">
"""
    
    # Add course details
    for course in schedule:
        code = course["code"]
        teacher = course.get("teacher", "TBA")
        room = course.get("room", "TBA")
        schedule_str = course.get("schedule", "TBA")
        enrolled = course.get("enrolled", "N/A")
        
        # Check if course is full
        full_indicator = ""
        if is_course_full(course):
            full_indicator = ' <span style="background: #f44336; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">FULL</span>'
        
        html += f"""                    <li>
                        <strong class="course-code">{code}</strong>{full_indicator}
                        <span>⏰ {schedule_str}</span>
                        <span>🏢 {room}</span>
                        <span>👨‍🏫 {teacher}</span>
                        <span>👥 {enrolled}</span>
                    </li>
"""
    
    html += """                </ul>
            </div>
        </div>
"""
    
    return html


def check_slot_availability(selected_dict: dict):
    """
    Checks availability of slots for selected courses.
    Displays warnings if courses have limited availability.
    """
    print(f"\n{'='*60}")
    print("Checking course slot availability...")
    print(f"{'='*60}\n")
    
    availability_issues = []
    
    for course_code, sections in selected_dict.items():
        print(f"Course: {course_code}")
        print(f"  Available sections: {len(sections)}")
        
        # Check each section's enrollment
        for section in sections:
            code = section["code"]
            status = section.get("status", "Unknown")
            enrolled = section.get("enrolled", "0")
            schedule = section.get("schedule", "TBA")
            
            # Extract enrollment numbers if available
            try:
                enrolled_num = int(''.join(filter(str.isdigit, enrolled.split('/')[0])))
                if enrolled_num > 0:
                    print(f"    - {code}: {status} ({enrolled})")
            except:
                print(f"    - {code}: {status}")
            
            # Check if status indicates limited slots
            if "closed" in status.lower() or "full" in status.lower():
                availability_issues.append(f"  ⚠ {code} appears to be closed or full")
        
        print()
    
    # Display warnings if any
    if availability_issues:
        print(f"\n{'='*60}")
        print("⚠ AVAILABILITY WARNINGS:")
        print(f"{'='*60}")
        for issue in availability_issues:
            print(issue)
        print()
        
        proceed = input("Continue generating schedules anyway? (y/N): ").strip().lower()
        if proceed != "y":
            return False
    else:
        print(f"✓ All selected courses have available slots\n")
    
    return True


def schedule_generator(filename: str = None):
    """
    Loads courses from JSON, lets user select which ones to schedule,
    then generates all valid schedule combinations.
    """
    if filename is None:
        filename = input("Enter JSON filename (or press Enter for courses.json): ").strip()
        if not filename:
            filename = os.path.join(JSON_DIR, "courses.json")
        elif not os.path.isabs(filename):
            # If relative path, look in JSON_DIR
            filename = os.path.join(JSON_DIR, filename)
    
    try:
        # Load courses
        with open(filename, "r", encoding="utf-8") as f:
            all_courses = json.load(f)
        
        print(f"\nLoaded {len(all_courses)} course sections from {filename}")
        
        # Filter out DISSOLVED courses and group by code
        courses_by_code = {}
        dissolved_count = 0
        for course in all_courses:
            status = course.get("status", "").upper()
            
            # Skip DISSOLVED courses
            if status == "DISSOLVED":
                dissolved_count += 1
                continue
            
            code = course.get("code", "").split(" - Group")[0]
            if code not in courses_by_code:
                courses_by_code[code] = []
            courses_by_code[code].append(course)
        
        if dissolved_count > 0:
            print(f"⏭ {dissolved_count} DISSOLVED section(s) excluded\n")
        
        print(f"Found {len(courses_by_code)} unique courses with {sum(len(v) for v in courses_by_code.values())} active section(s)\n")
        
        # Display available courses
        sorted_codes = sorted(courses_by_code.keys())
        for i, code in enumerate(sorted_codes, 1):
            sections = courses_by_code[code]
            print(f"{i:2d}. {code:20s} - {len(sections)} section(s)")
        
        # Get user selection
        print("\nEnter course numbers to schedule (comma-separated, e.g., 1,3,5)")
        print("Or type 'all' to select all courses")
        selection = input("Selection: ").strip().lower()
        
        selected_codes = []
        if selection == "all":
            selected_codes = sorted_codes
        else:
            try:
                indices = [int(x.strip()) - 1 for x in selection.split(",")]
                selected_codes = [sorted_codes[i] for i in indices if 0 <= i < len(sorted_codes)]
            except (ValueError, IndexError):
                print("Invalid selection.")
                return
        
        if not selected_codes:
            print("No courses selected.")
            return
        
        # Filter to selected courses only
        selected_dict = {code: courses_by_code[code] for code in selected_codes}
        
        # Check slot availability before generating schedules
        if not check_slot_availability(selected_dict):
            print("Schedule generation cancelled.")
            return
        
        print(f"Generating schedule combinations for {len(selected_codes)} course(s)...")
        start_time = time.time()
        
        # Generate combinations
        combinations_raw = generate_schedule_combinations(selected_dict, max_combinations=100)
        
        # Add status to each combination
        combinations = []
        for combo in combinations_raw:
            status_info = get_schedule_status(combo)
            combinations.append({
                "courses": combo,
                "status": status_info["status"],
                "full_courses": status_info["full_courses"]
            })
        
        elapsed = time.time() - start_time
        
        # Display results
        print(f"\n{'='*60}")
        print(f"✓ Found {len(combinations)} valid schedule combination(s)")
        print(f"✓ Generation time: {format_time(elapsed)}")
        print(f"{'='*60}\n")
        
        if len(combinations) == 0:
            print("No valid combinations found (courses have conflicts).\n")
            return
        
        # Generate HTML visualization
        print("Generating calendar visualization...")
        generate_schedule_html(combinations)
        
        # Option to display console view as well
        console_view = input("\nAlso display console view? (y/N): ").strip().lower()
        if console_view == "y":
            # Display each combination in console
            for i, combo_dict in enumerate(combinations, 1):
                combo = combo_dict["courses"]
                status = combo_dict["status"]
                status_icon = "✓" if status == "available" else "✗"
                print(f"\n--- Schedule Option {i} [{status_icon} {status.upper()}] ---")
                for course in combo:
                    code = course["code"]
                    schedule = course["schedule"]
                    room = course["room"]
                    teacher = course["teacher"]
                    enrolled = course.get("enrolled", "N/A")
                    full_marker = " [FULL]" if is_course_full(course) else ""
                    print(f"  {code:25s} | {schedule:20s} | {room:10s} | {teacher} | {enrolled}{full_marker}")
        
        # Option to save
        save_choice = input("\nSave schedules to JSON file? (y/N): ").strip().lower()
        if save_choice == "y":
            os.makedirs(JSON_DIR, exist_ok=True)
            output_filename = os.path.join(JSON_DIR, f"schedules_{int(time.time())}.json")
            with open(output_filename, "w", encoding="utf-8") as f:
                json.dump(combinations, f, indent=2, ensure_ascii=False)
            print(f"✓ Saved to {output_filename}")
    
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
    except json.JSONDecodeError:
        print(f"Error: '{filename}' is not a valid JSON file.")


# ============================================================================
# SCRAPING FUNCTIONS
# ============================================================================

def json_scrape(page: Page):
    """
    Extracts course data from all pages of the table.
    Handles pagination automatically.
    Returns a list of course dictionaries without saving.
    """
    all_courses = []
    current_page = 1
    seen_codes = set()
    
    while True:
        # Wait for table to load
        page.locator("tbody tr").first.wait_for(state="visible")
        polite_pause()
        
        rows = page.locator("tbody tr").all()
        page_courses = []
        
        for row in rows:
            cells = row.locator("td").all()
            
            # Skip incomplete rows
            if len(cells) < 7:
                continue
            
            # Extract data from each cell
            code = cells[0].inner_text().strip()
            description = cells[1].inner_text().strip()
            status = cells[2].inner_text().strip()
            teacher = cells[3].inner_text().strip()
            full_schedule = cells[4].inner_text().strip()
            department = cells[5].inner_text().strip()
            enrolled = cells[6].inner_text().strip()
            
            # Separate schedule into time and room
            if " " in full_schedule:
                time_part, _, room_part = full_schedule.rpartition(' ')
            else:
                time_part = full_schedule
                room_part = "TBA"
            
            # Build course dictionary
            course = {
                "code": code,
                "description": description,
                "status": status,
                "teacher": teacher,
                "schedule": time_part,
                "room": room_part,
                "department": department,
                "enrolled": enrolled
            }
            
            if code not in seen_codes:
                seen_codes.add(code)
                page_courses.append(course)
        
        all_courses.extend(page_courses)
        print(f"    - Page {current_page}: {len(page_courses)} sections")
        
        # Check if there's a next page button
        next_button = page.locator('a[rel="next"]')
        
        if next_button.count() > 0:
            # Click next page and wait for the active page number to change
            try:
                active_page = page.locator("ul.pagination li.active a").first.inner_text().strip()
            except Exception:
                active_page = str(current_page)

            next_button.first.click()
            current_page += 1

            page.wait_for_function(
                "(prev) => {\n"
                "  const el = document.querySelector('ul.pagination li.active a');\n"
                "  return el && el.textContent.trim() !== prev;\n"
                "}",
                arg=active_page,
                timeout=45000,
            )
            page.locator("tbody tr").first.wait_for(state="visible", timeout=45000)
            polite_pause()
        else:
            # No more pages
            break
    
    return all_courses


# ============================================================================
# AUTHENTICATION & NAVIGATION
# ============================================================================

def scrape_academic_options(username: str, password: str, headless: bool = True):
    """
    Logs into ISMIS and scrapes available academic periods and years.
    Returns a dictionary with academic_periods (list of dicts) and academic_years (list of strings).
    """
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()
        setup_page_optimizations(page)
        
        # Navigate to login page
        page.goto("https://ismis.usc.edu.ph/Account/Login?ReturnUrl=%2F", wait_until="domcontentloaded")
        
        # Enter credentials and submit
        page.locator("#Username").fill(username)
        page.locator("#Password").fill(password)
        page.get_by_role("button", name="Login").click()
        page.locator("#Username").wait_for(state="hidden", timeout=45000)
        polite_pause()
        
        # Navigate to course schedule page
        page.goto("https://ismis.usc.edu.ph/courseschedule/CourseScheduleOfferedIndex", wait_until="domcontentloaded")
        
        # Verify successful navigation
        expect(page).to_have_title(re.compile("Academic Module", re.IGNORECASE))
        
        # Open the calendar filter
        page.locator("i.fa-calendar").click()
        polite_pause(0.5, 1.0)
        
        # Extract academic period options
        period_options = []
        period_select = page.locator("#AcademicPeriod option")
        for i in range(period_select.count()):
            option = period_select.nth(i)
            value = option.get_attribute("value")
            label = option.inner_text()
            
            # Skip empty options
            if value and value != "":
                period_options.append({
                    "value": value,
                    "label": label
                })
        
        # Extract academic year options
        year_options = []
        year_select = page.locator("#AcademicYear option")
        for i in range(year_select.count()):
            option = year_select.nth(i)
            value = option.get_attribute("value")
            
            # Skip empty options
            if value and value != "":
                year_options.append(value)
        
        browser.close()
        
        return {
            "academic_periods": period_options,
            "academic_years": year_options
        }


def login_inputs():
    """
    Prompts user for login credentials and courses to search.
    Returns username, password, list of courses, academic period, and academic year.
    """
    username = input("Enter your username: ")
    password = input("Enter your password: ")
    courses_input = input("Enter course codes (comma-separated, e.g., GE-STS, CIS 2203, CS 4206): ")
    
    # Parse courses: split by comma, strip whitespace from each
    courses = [course.strip() for course in courses_input.split(',')]
    
    academic_period, _ = get_academic_period_choice()
    academic_year = input("Enter academic year (e.g., 2025): ")
    
    return username, password, courses, academic_period, academic_year


def dummy_inputs():
    """
    Returns hardcoded test values for quick testing.
    Use this to skip manual input during development.
    """
    username = "*********"
    password = "*********"
    courses = ["CIS 2106"]
    academic_period = "SECOND_SEMESTER"
    academic_year = "2025"
    
    return username, password, courses, academic_period, academic_year


def scrape_all_courses(headless=False):
    """
    Scrapes ALL courses for a given academic period and year.
    Prompts for credentials and academic info (but not specific courses).
    Saves to a file named like '2nd-Semester_2025.json'.
    
    Args:
        headless: If True, runs browser in headless mode (no UI).
    """
    # Get user inputs (no course codes needed)
    username = input("Enter your username: ")
    password = input("Enter your password: ")
    
    academic_period, period_name = get_academic_period_choice()
    academic_year = input("Enter academic year (e.g., 2025): ")
    
    # Generate filename
    filename = f"{period_name}_{academic_year}.json"
    
    print(f"\n{'='*50}")
    print(f"Scraping ALL courses for {period_name} {academic_year}")
    print(f"Results will be saved to: {filename}")
    print(f"{'='*50}\n")
    
    # Launch browser and scrape
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()
        setup_page_optimizations(page)
        
        # Navigate to login page
        page.goto("https://ismis.usc.edu.ph/Account/Login?ReturnUrl=%2F")
        
        # Enter credentials and submit
        page.locator("#Username").fill(username)
        page.locator("#Password").fill(password)
        page.get_by_role("button", name="Login").click()
        page.locator("#Username").wait_for(state="hidden", timeout=45000)
        polite_pause()
        
        # Navigate to course schedule page
        page.goto("https://ismis.usc.edu.ph/courseschedule/CourseScheduleOfferedIndex")
        
        # Verify successful navigation
        expect(page).to_have_title(re.compile("Academic Module", re.IGNORECASE))
        
        # Set up filters
        page.locator("i.fa-calendar").click()
        page.locator("#AcademicPeriod").select_option(academic_period)
        page.locator("#AcademicYear").select_option(academic_year)
        
        # Leave course search empty and click search to get ALL courses
        page.locator("#Courses").fill("")
        page.locator("i.fa-search").click()
        
        # Wait for results to load
        page.locator("tbody tr").first.wait_for(state="visible", timeout=45000)
        polite_pause()
        
        print("Scraping all courses...\n")
        
        # Start timer
        start_time = time.time()
        
        # Scrape all data
        all_courses = json_scrape(page)
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Save to dynamically named file
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(all_courses, f, indent=4, ensure_ascii=False)
        
        # Count unique course types (without group numbers)
        unique_courses = set()
        for course in all_courses:
            # Extract course code before " - Group"
            code_without_group = course["code"].split(" - Group")[0]
            unique_courses.add(code_without_group)
        
        print(f"\n{'='*50}")
        print(f"✓ {len(unique_courses)} unique courses found")
        print(f"✓ Total: {len(all_courses)} course sections saved to {filename}")
        print(f"✓ Time elapsed: {format_time(elapsed_time)}")
        print(f"{'='*50}")
        
        # Keep browser open briefly before closing
        page.wait_for_timeout(5000)
        
        # Clean up
        browser.close()


def login(page: Page, username: str, password: str, courses: list, academic_period: str, academic_year: str):
    """
    Logs into USC ISMIS, navigates to course schedule page,
    filters for specific courses, and initiates scraping.
    """
    # Navigate to login page
    page.goto("https://ismis.usc.edu.ph/Account/Login?ReturnUrl=%2F", wait_until="domcontentloaded")
    
    # Enter credentials and submit
    page.locator("#Username").fill(username)
    page.locator("#Password").fill(password)
    page.get_by_role("button", name="Login").click()
    # Wait for post-login UI to be ready
    page.locator("#Username").wait_for(state="hidden", timeout=45000)
    polite_pause()
    
    # Navigate to course schedule page
    page.goto("https://ismis.usc.edu.ph/courseschedule/CourseScheduleOfferedIndex", wait_until="domcontentloaded")
    
    # Verify successful navigation
    expect(page).to_have_title(re.compile("Academic Module", re.IGNORECASE))
    
    # Set up filters (one-time setup)
    page.locator("i.fa-calendar").click()
    page.locator("#AcademicPeriod").select_option(academic_period)
    page.locator("#AcademicYear").select_option(academic_year)
    
    # Scrape all courses
    all_courses = []
    start_time = time.time()
    
    print(f"\nScraping {len(courses)} course(s)...\n")
    
    for idx, course_code in enumerate(courses, 1):
        print(f"\nSearching for: {course_code}...")
        show_progress(idx - 1, len(courses), prefix="Overall")
        
        # Clear and fill course search box
        page.locator("#Courses").fill("")
        page.locator("#Courses").fill(course_code)
        page.locator("i.fa-search").click()
        
        # Wait for results table to refresh
        try:
            page.locator("tbody tr").first.wait_for(state="visible", timeout=45000)
            polite_pause()
            
            # Scrape this course's data
            course_data = json_scrape(page)
            all_courses.extend(course_data)
            print(f"  ✓ Found {len(course_data)} sections")
        except Exception:
            print(f"  ✗ No results found for {course_code}")
            continue
    
    show_progress(len(courses), len(courses), prefix="Overall")
    
    # Calculate elapsed time
    elapsed_time = time.time() - start_time
    
    # Save all results to JSON
    with open("courses.json", "w", encoding="utf-8") as f:
        json.dump(all_courses, f, indent=4, ensure_ascii=False)
    
    # Count unique course types (without group numbers)
    unique_courses = set()
    for course in all_courses:
        # Extract course code before " - Group"
        code_without_group = course["code"].split(" - Group")[0]
        unique_courses.add(code_without_group)
    
    print(f"\n{'='*50}")
    print(f"✓ {len(unique_courses)} course types found")
    print(f"✓ Total: {len(all_courses)} course sections saved to courses.json")
    print(f"✓ Time elapsed: {format_time(elapsed_time)}")
    print(f"{'='*50}")
def check_duplicates(filename: str = None):
    """
    Checks a JSON file for duplicate course codes.
    Returns True if duplicates found, False otherwise.
    
    Args:
        filename: Path to the JSON file. If None, prompts user for input.
    """
    if filename is None:
        filename = input("Enter JSON filename (default: courses.json): ").strip()
        if not filename:
            filename = "courses.json"
    
    try:
        # Read JSON file
        with open(filename, "r", encoding="utf-8") as f:
            courses = json.load(f)
        
        print(f"\nChecking {filename} for duplicates...\n")
        
        # Track course codes and their occurrences
        code_count = {}
        duplicates = []
        
        for course in courses:
            code = course.get("code", "")
            code_count[code] = code_count.get(code, 0) + 1
        
        # Find duplicates
        for code, count in code_count.items():
            if count > 1:
                duplicates.append((code, count))
        
        # Display results
        print(f"{'='*50}")
        print(f"Total courses in file: {len(courses)}")
        print(f"Unique course codes: {len(code_count)}")
        
        if duplicates:
            print(f"\n⚠ DUPLICATES FOUND: {len(duplicates)}")
            print(f"{'='*50}")
            for code, count in sorted(duplicates):
                print(f"  • {code}: appears {count} times")
            print(f"{'='*50}\n")
            return True
        else:
            print(f"\n✓ NO DUPLICATES FOUND")
            print(f"{'='*50}\n")
            return False
            
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        return None
    except json.JSONDecodeError:
        print(f"Error: '{filename}' is not a valid JSON file.")
        return None


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print("=" * 50)
    print("USC ISMIS Course Schedule Scraper")
    print("=" * 50)
    print("\nChoose scraping mode:")
    print("  1 - Scrape specific courses")
    print("  2 - Scrape ALL courses")
    print("  3 - Check for duplicates in JSON")
    print("  4 - Generate schedule combinations")
    
    mode = input("\nSelect mode (1, 2, 3, or 4): ").strip()
    
    if mode == "3":
        # Check for duplicates in JSON file
        filename = input("Enter JSON filename (or press Enter for courses.json): ").strip()
        if not filename:
            filename = "courses.json"
        has_duplicates = check_duplicates(filename)
        if has_duplicates is not None:
            print(f"Result: {has_duplicates}")
    elif mode == "4":
        # Generate schedule combinations
        schedule_generator()
    else:
        headless_choice = input("Run in headless mode? (browser hidden) [y/N]: ").strip().lower()
        headless = headless_choice == 'y'
        
        if mode == "2":
            # Scrape all courses
            scrape_all_courses(headless=headless)
        else:
            # Scrape specific courses (default)
            # For testing: use dummy_inputs() | For real use: use login_inputs()
            username, password, courses, academic_period, academic_year = login_inputs()
            
            with sync_playwright() as p:
                # Launch browser
                browser = p.chromium.launch(headless=headless)
                page = browser.new_page()
                setup_page_optimizations(page)
                
                # Execute scraping workflow
                login(page, username, password, courses, academic_period, academic_year)
                
                # Keep browser open briefly before closing
                page.wait_for_timeout(6000)
                
                # Clean up
                browser.close()
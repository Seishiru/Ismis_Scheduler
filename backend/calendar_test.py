"""
Test file for calendar schedule visualization
Used to debug schedule parsing and display issues
"""

import re
import time
import json
import os

# ============================================================================
# PATH CONFIGURATION
# ============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
HTML_DIR = os.path.join(PROJECT_ROOT, "generated", "html")

# ============================================================================
# DUMMY TEST DATA
# ============================================================================

DUMMY_COURSES = [
    {
        "code": "GE-STS - Group 1",
        "description": "SCIENCE, TECHNOLOGY AND SOCIETY",
        "status": "BLOCKSECTION",
        "teacher": "LIWAG, JOHN WARUEL F.",
        "schedule": "TTh 09:00 AM - 10:30 AM",
        "room": "LB264TC",
        "department": "DEPARTMENT OF COMPUTER ENGINEERING",
        "enrolled": "41/41"
    },
    {
        "code": "GE-STS - Group 6",
        "description": "SCIENCE, TECHNOLOGY AND SOCIETY",
        "status": "BLOCKSECTION",
        "teacher": "PILI, UNOFRE B.",
        "schedule": "MW 09:00 AM - 10:30 AM",
        "room": "MR103TC",
        "department": "DEPARTMENT OF FINE ARTS",
        "enrolled": "40/40"
    },
    {
        "code": "CIS 2101 - Group 1",
        "description": "DATABASE SYSTEMS",
        "status": "BLOCKSECTION",
        "teacher": "SABADO, JANIE LANE T.",
        "schedule": "MW 10:00 AM - 12:30 PM",
        "room": "LB448TC",
        "department": "DEPARTMENT OF COMPUTER SCIENCE",
        "enrolled": "30/30"
    },
    {
        "code": "CIS 2106N - Group 1",
        "description": "MOBILE DEVELOPMENT LAB",
        "status": "BLOCKSECTION",
        "teacher": "DELA PAZ, KHENT L.",
        "schedule": "Sat 07:30 AM - 10:30 AM",
        "room": "LB448TC",
        "department": "DEPARTMENT OF COMPUTER SCIENCE",
        "enrolled": "28/28"
    },
    {
        "code": "CIS 2203 - Group 2",
        "description": "WEB DEVELOPMENT",
        "status": "BLOCKSECTION",
        "teacher": "GONZALES, JOFFERSON T.",
        "schedule": "TTh 01:30 PM - 04:00 PM",
        "room": "LB447TC",
        "department": "DEPARTMENT OF COMPUTER SCIENCE",
        "enrolled": "25/25"
    },
    {
        "code": "PE 101 - Group 5",
        "description": "PHYSICAL EDUCATION",
        "status": "DISSOLVED",
        "teacher": "",
        "schedule": "F 02:00 PM - 04:00 PM",
        "room": "GYM1",
        "department": "DEPARTMENT OF PE",
        "enrolled": "0/30"
    }
]


# ============================================================================
# PARSING FUNCTIONS (copied from main file)
# ============================================================================

def parse_schedule(schedule_str: str):
    """
    Parses a schedule string like "MWF 10:00-12:00" or "Sat 07:30 AM - 10:30 AM" into structured data.
    Returns a dict with 'days' (list) and 'time' (tuple) or None if invalid.
    """
    if not schedule_str or schedule_str.upper() == "TBA":
        print(f"  → TBA schedule: {schedule_str}")
        return None
    
    schedule_str = schedule_str.strip()
    print(f"  → Parsing: '{schedule_str}'")
    
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
    # Updated pattern to handle "TTh" style (capital + lowercase) and capture AM/PM for each time
    match = re.match(r"([MTWRFSUmtwrfsu]+h?)\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?", schedule_str, re.IGNORECASE)
    
    if match:
        days_str = match.group(1).upper()
        start_hour = int(match.group(2))
        start_min = int(match.group(3))
        start_ampm = match.group(4) # AM/PM for start time
        end_hour = int(match.group(5))
        end_min = int(match.group(6))
        end_ampm = match.group(7)  # AM/PM for end time
        
        # Normalize "TTh" or "Tth" to "TR" (Tuesday-Thursday)
        days_str = days_str.replace("TH", "R").replace("H", "")
        
        print(f"  → Matched single-letter pattern: days={days_str}, time={start_hour}:{start_min} {start_ampm or ''}- {end_hour}:{end_min} {end_ampm or ''}")
        
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
            print(f"  → ❌ Failed to parse schedule")
            return None
        
        days_input = match.group(1).upper()
        start_hour = int(match.group(2))
        start_min = int(match.group(3))
        start_ampm = match.group(4)
        end_hour = int(match.group(5))
        end_min = int(match.group(6))
        end_ampm = match.group(7)
        
        print(f"  → Matched full day pattern: days={days_input}, time={start_hour}:{start_min} {start_ampm or ''}- {end_hour}:{end_min} {end_ampm or ''}")
        
        # Convert full day names to single-letter codes
        days_str = ""
        for day_name, day_code in day_mapping.items():
            if days_input.startswith(day_name):
                days_str = day_code
                print(f"  → Converted {days_input} → {day_code}")
                break
        
        if not days_str:
            print(f"  → ❌ Failed to convert day name: {days_input}")
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
    
    # Check if schedule has AM/PM indicators (legacy check removed - now handled above)
    # Convert to minutes for easier comparison
    start_minutes = start_hour * 60 + start_min
    end_minutes = end_hour * 60 + end_min
    
    result = {
        "days": list(days_str),
        "start": start_minutes,
        "end": end_minutes
    }
    
    print(f"  → ✓ Parsed result: days={result['days']}, start={start_minutes//60}:{start_minutes%60:02d}, end={end_minutes//60}:{end_minutes%60:02d}")
    return result


def generate_simple_calendar_html(courses: list):
    """
    Generates a simplified HTML calendar for testing
    """
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"]
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_abbrev = ['M', 'T', 'W', 'R', 'F', 'S', 'U']
    
    # Parse all courses
    course_by_day_time = {}
    color_map = {}
    min_time = 24 * 60
    max_time = 0
    parsed_count = 0
    failed_count = 0
    
    print("\n" + "="*60)
    print("PARSING ALL COURSES")
    print("="*60)
    
    for idx, course in enumerate(courses):
        code = course["code"]
        schedule = course["schedule"]
        status = course["status"]
        
        print(f"\n[{idx+1}] {code}")
        print(f"  Status: {status}")
        
        # Skip DISSOLVED
        if status.upper() == "DISSOLVED":
            print(f"  → ⏭ SKIPPED (DISSOLVED)")
            continue
        
        parsed = parse_schedule(schedule)
        
        if code not in color_map:
            color_map[code] = colors[len(color_map) % len(colors)]
        
        if parsed:
            parsed_count += 1
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
            print(f"  → ✓ Added to calendar")
        else:
            failed_count += 1
            print(f"  → ❌ Failed to parse")
    
    print(f"\n" + "="*60)
    print(f"PARSING SUMMARY")
    print(f"="*60)
    print(f"✓ Successfully parsed: {parsed_count}")
    print(f"❌ Failed to parse: {failed_count}")
    print(f"📚 Total courses in calendar: {len(course_by_day_time)}")
    print()
    
    # Ensure reasonable default time range
    if min_time == 24 * 60:
        min_time = 7 * 60
    if max_time == 0:
        max_time = 18 * 60
    
    min_time = (min_time // 30) * 30
    max_time = ((max_time + 29) // 30) * 30
    
    # Build HTML
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar Test - ISMIS Schedule</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .info {
            background: white;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .calendar-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
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
            background: #f9f9f9;
        }
        .calendar td:first-child {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
            width: 80px;
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
    </style>
</head>
<body>
    <div class="container">
        <h1>📅 Calendar Test - Debug Mode</h1>
        
        <div class="info">
            <h3>Test Summary:</h3>
            <p>✓ Successfully parsed: """ + str(parsed_count) + """</p>
            <p>❌ Failed to parse: """ + str(failed_count) + """</p>
            <p>📚 Time slots in calendar: """ + str(len(course_by_day_time)) + """</p>
            <p>⏰ Time range: """ + f"{min_time//60:02d}:{min_time%60:02d} - {max_time//60:02d}:{max_time%60:02d}" + """</p>
        </div>
        
        <div class="calendar-container">
            <h2>Weekly Schedule</h2>
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
    
    # Generate time slots
    time_slot = min_time
    while time_slot <= max_time:
        hours = time_slot // 60
        minutes = time_slot % 60
        time_str = f"{hours:02d}:{minutes:02d}"
        
        html += f"                    <tr>\n                        <td>{time_str}</td>\n"
        
        for day_abbrev_char in day_abbrev:
            cell_content = ""
            
            for key, data in course_by_day_time.items():
                if key[0] == day_abbrev_char and data["start"] <= time_slot < data["end"]:
                    cell_content = f'<div class="course-block" style="border-left-color: {data["color"]}; background: {data["color"]};">{data["code"]}</div>'
                    break
            
            html += f"                        <td>{cell_content}</td>\n"
        
        html += "                    </tr>\n"
        time_slot += 30
    
    html += """                </tbody>
            </table>
        </div>
        
        <div class="info" style="margin-top: 20px;">
            <h3>Course List:</h3>
            <ul>
"""
    
    for course in courses:
        if course["status"].upper() != "DISSOLVED":
            html += f"                <li><strong>{course['code']}</strong> - {course['schedule']} - {course['room']} - {course['teacher']}</li>\n"
    
    html += """            </ul>
        </div>
    </div>
</body>
</html>"""
    
    return html


# ============================================================================
# TEST RUNNER
# ============================================================================

if __name__ == "__main__":
    print("="*60)
    print("CALENDAR TEST - DEBUGGING SCHEDULE PARSER")
    print("="*60)
    print()
    print(f"Testing with {len(DUMMY_COURSES)} dummy courses")
    print()
    
    # Generate HTML
    html_content = generate_simple_calendar_html(DUMMY_COURSES)
    
    # Save to file
    os.makedirs(HTML_DIR, exist_ok=True)
    filename = os.path.join(HTML_DIR, "calendar_test_output.html")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print(f"\n✓ Test HTML saved to: {filename}")
    
    # Try to open in browser
    try:
        import webbrowser
        import os
        webbrowser.open('file://' + os.path.realpath(filename))
        print("✓ Opening in browser...")
    except:
        print(f"Please open {filename} in your browser to view results.")

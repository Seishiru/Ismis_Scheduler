"""
FastAPI Backend Server for ISMIS Course Scheduler
Provides REST API endpoints for the React frontend
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import json
import os
import time
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from models import (
    LoginRequest,
    LoginResponse,
    AcademicOptions,
    AcademicOption,
    ScrapeSpecificRequest,
    ScrapeAllRequest,
    ScrapeResponse,
    ScrapeStatus,
    GenerateSchedulesRequest,
    GenerateSchedulesResponse,
    CoursesResponse,
    Course,
    ScheduleCombination,
    ErrorResponse,
)

# Import core functions from ismis_scheduler
import sys
sys.path.append(os.path.dirname(__file__))
from ismis_scheduler import (
    generate_schedule_combinations,
    get_schedule_status,
    parse_schedule,
    scrape_academic_options,
)

# ============================================================================
# APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="ISMIS Course Scheduler API",
    description="Backend API for USC ISMIS Course Scheduling System",
    version="1.0.0",
)

# Enable CORS for frontend
# Get allowed origins from environment variable or use defaults
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# GLOBAL STATE
# ============================================================================

# Store scraping tasks in memory (in production, use Redis or database)
scraping_tasks: Dict[str, ScrapeStatus] = {}

# Path configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
GENERATED_DIR = os.path.join(PROJECT_ROOT, "generated")
JSON_DIR = os.path.join(GENERATED_DIR, "json")

# Ensure directories exist
os.makedirs(JSON_DIR, exist_ok=True)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_latest_courses_file() -> Optional[str]:
    """Find the most recently modified courses JSON file"""
    try:
        json_files = [f for f in os.listdir(JSON_DIR) if f.endswith('.json')]
        if not json_files:
            return None
        latest = max(json_files, key=lambda f: os.path.getmtime(os.path.join(JSON_DIR, f)))
        return os.path.join(JSON_DIR, latest)
    except Exception:
        return None


def load_courses_from_file(filename: Optional[str] = None) -> List[Dict]:
    """Load courses from JSON file"""
    if filename is None:
        filename = get_latest_courses_file()
    elif not os.path.isabs(filename):
        # If filename is not an absolute path, assume it's in JSON_DIR
        filename = os.path.join(JSON_DIR, filename)
    
    if filename is None or not os.path.exists(filename):
        print(f"[ERROR] File not found: {filename}")
        return []
    
    try:
        print(f"[INFO] Loading courses from: {filename}")
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"[INFO] Loaded {len(data)} courses")
        return data
    except Exception as e:
        print(f"Error loading courses: {e}")
        return []


def scrape_task_worker(task_id: str, request_data: dict, scrape_type: str):
    """Background worker for scraping tasks"""
    try:
        # Update status to running
        scraping_tasks[task_id].status = "running"
        scraping_tasks[task_id].current_task = "Initializing browser..."
        
        # Import here to avoid circular imports
        from playwright.sync_api import sync_playwright
        from ismis_scheduler import (
            setup_page_optimizations,
            json_scrape,
            polite_pause,
        )
        import re
        from playwright.sync_api import expect
        
        courses_data = []
        
        # Get headless mode from request, default to True if not specified
        headless_mode = request_data.get("headless", True)
        
        with sync_playwright() as p:
            # Launch browser with headless mode from settings
            browser = p.chromium.launch(headless=headless_mode)
            page = browser.new_page()
            setup_page_optimizations(page)
            
            # Login
            scraping_tasks[task_id].current_task = "Logging in..."
            page.goto("https://ismis.usc.edu.ph/Account/Login?ReturnUrl=%2F")
            page.locator("#Username").fill(request_data["username"])
            page.locator("#Password").fill(request_data["password"])
            page.get_by_role("button", name="Login").click()
            page.locator("#Username").wait_for(state="hidden", timeout=45000)
            polite_pause()
            
            # Navigate to course schedule page
            scraping_tasks[task_id].current_task = "Navigating to courses..."
            page.goto("https://ismis.usc.edu.ph/courseschedule/CourseScheduleOfferedIndex")
            expect(page).to_have_title(re.compile("Academic Module", re.IGNORECASE))
            
            # Set filters
            page.locator("i.fa-calendar").click()
            page.locator("#AcademicPeriod").select_option(request_data["academic_period"])
            page.locator("#AcademicYear").select_option(request_data["academic_year"])
            
            if scrape_type == "specific":
                # Scrape specific courses
                courses = request_data["courses"]
                scraping_tasks[task_id].total = len(courses)
                
                for idx, course_code in enumerate(courses):
                    scraping_tasks[task_id].progress = idx
                    scraping_tasks[task_id].current_task = f"Scraping {course_code}..."
                    
                    page.locator("#Courses").fill("")
                    page.locator("#Courses").fill(course_code)
                    page.locator("i.fa-search").click()
                    
                    # Wait for the table body to appear and check if we have results
                    try:
                        page.locator("tbody tr").first.wait_for(state="visible", timeout=45000)
                        polite_pause()
                        
                        course_sections = json_scrape(page)
                        courses_data.extend(course_sections)
                    except Exception:
                        # No results found for this course - continue to next one
                        print(f"No results found for {course_code}")
                        continue
                
                scraping_tasks[task_id].progress = len(courses)
                
            else:  # scrape_type == "all"
                # Scrape all courses
                scraping_tasks[task_id].current_task = "Scraping all courses..."
                page.locator("#Courses").fill("")
                page.locator("i.fa-search").click()
                page.locator("tbody tr").first.wait_for(state="visible", timeout=45000)
                polite_pause()
                
                courses_data = json_scrape(page)
            
            # Cleanup
            browser.close()
        
        # Save to file
        period_map = {
            "FIRST_SEMESTER": "1st-Semester",
            "SECOND_SEMESTER": "2nd-Semester",
            "SUMMER": "Summer",
            "FIRST_TRIMESTER": "1st-Trimester",
            "SECOND_TRIMESTER": "2nd-Trimester",
            "THIRD_TRIMESTER": "3rd-Trimester",
            "TRANSITION_SEMESTER": "Transition-Term"
        }
        period_name = period_map.get(request_data["academic_period"], "courses")
        
        # Include scrape type in filename to prevent overwriting
        scrape_type_suffix = "_specific" if scrape_type == "specific" else "_all"
        filename = os.path.join(JSON_DIR, f"{period_name}_{request_data['academic_year']}{scrape_type_suffix}.json")
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(courses_data, f, indent=2, ensure_ascii=False)
        
        print(f"[SCRAPE SUCCESS] Saved {len(courses_data)} courses to {filename}")
        
        # Update status to completed
        scraping_tasks[task_id].status = "completed"
        scraping_tasks[task_id].current_task = "Done!"
        scraping_tasks[task_id].courses = [Course(**c) for c in courses_data]
        scraping_tasks[task_id].saved_file = os.path.basename(filename)  # Store the filename
        
    except Exception as e:
        scraping_tasks[task_id].status = "failed"
        scraping_tasks[task_id].error = str(e)


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "name": "ISMIS Course Scheduler API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "courses": "/api/courses",
            "scrape": "/api/scrape/*",
            "schedules": "/api/schedules/*"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_tasks": len([t for t in scraping_tasks.values() if t.status == "running"])
    }


@app.get("/api/options")
async def get_academic_options():
    """Get available academic periods and years for scraping (static fallback)"""
    return {
        "academic_periods": [
            {"value": "NONE", "label": "None"},
            {"value": "FIRST_SEMESTER", "label": "1ST Semester"},
            {"value": "SECOND_SEMESTER", "label": "2ND Semester"},
            {"value": "SUMMER", "label": "Summer"},
            {"value": "FIRST_TRIMESTER", "label": "1ST Trimester"},
            {"value": "SECOND_TRIMESTER", "label": "2ND Trimester"},
            {"value": "THIRD_TRIMESTER", "label": "3RD Trimester"},
            {"value": "TRANSITION_SEMESTER", "label": "Transition Term"},
            {"value": "SENIORHIGH_TRANSITION_SEMESTER_1", "label": "Senior High - Transition Semester 1"},
            {"value": "SENIORHIGH_TRANSITION_SEMESTER_2", "label": "Senior High - Transition Semester 2"},
        ],
        "academic_years": [str(year) for year in range(2029, 1991, -1)]
    }


@app.post("/api/login", response_model=LoginResponse)
async def login_and_get_options(request: LoginRequest):
    """
    Login to ISMIS and retrieve available academic periods and years.
    This separates the login process from scraping to get real-time options.
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    try:
        # Run the synchronous Playwright function in a thread pool
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            options_data = await loop.run_in_executor(
                executor,
                scrape_academic_options,
                request.username,
                request.password,
                True  # headless
            )
        
        return LoginResponse(
            message="Login successful",
            options=AcademicOptions(
                academic_periods=[AcademicOption(**opt) for opt in options_data["academic_periods"]],
                academic_years=options_data["academic_years"]
            )
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


@app.post("/api/scrape/specific", response_model=ScrapeResponse)
async def scrape_specific_courses(
    request: ScrapeSpecificRequest,
    background_tasks: BackgroundTasks
):
    """Scrape specific courses from ISMIS"""
    task_id = str(uuid.uuid4())
    
    # Initialize task status
    scraping_tasks[task_id] = ScrapeStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        total=len(request.courses),
        current_task="Queued"
    )
    
    # Start background task
    background_tasks.add_task(
        scrape_task_worker,
        task_id,
        request.model_dump(),
        "specific"
    )
    
    return ScrapeResponse(
        task_id=task_id,
        message="Scraping task started",
        status="pending"
    )


@app.post("/api/scrape/all", response_model=ScrapeResponse)
async def scrape_all_courses(
    request: ScrapeAllRequest,
    background_tasks: BackgroundTasks
):
    """Scrape all courses from ISMIS"""
    task_id = str(uuid.uuid4())
    
    # Initialize task status
    scraping_tasks[task_id] = ScrapeStatus(
        task_id=task_id,
        status="pending",
        current_task="Queued"
    )
    
    # Start background task
    background_tasks.add_task(
        scrape_task_worker,
        task_id,
        request.model_dump(),
        "all"
    )
    
    return ScrapeResponse(
        task_id=task_id,
        message="Scraping task started",
        status="pending"
    )


@app.get("/api/scrape/status/{task_id}", response_model=ScrapeStatus)
async def get_scrape_status(task_id: str):
    """Get status of a scraping task"""
    if task_id not in scraping_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return scraping_tasks[task_id]


@app.get("/api/courses", response_model=CoursesResponse)
async def get_courses(filename: Optional[str] = None):
    """Get scraped courses from JSON file"""
    courses_data = load_courses_from_file(filename)
    
    if not courses_data:
        return CoursesResponse(courses=[], count=0, unique_codes=0)
    
    # Count unique course codes (without group numbers)
    unique_codes = set()
    for course in courses_data:
        code = course.get("code", "").split(" - Group")[0]
        unique_codes.add(code)
    
    return CoursesResponse(
        courses=[Course(**c) for c in courses_data],
        count=len(courses_data),
        unique_codes=len(unique_codes)
    )


@app.get("/api/courses/cached", response_model=CoursesResponse)
async def get_cached_courses():
    """Get the most recently cached courses (instant load, no scraping required)"""
    courses_data = load_courses_from_file()
    
    last_updated = None
    
    if courses_data:
        # Get the file's modification time
        json_file = get_latest_courses_file()
        if json_file and os.path.exists(json_file):
            try:
                mod_time = os.path.getmtime(json_file)
                last_updated = datetime.fromtimestamp(mod_time).isoformat()
            except Exception:
                pass
        
        # Count unique course codes (without group numbers)
        unique_codes = set()
        for course in courses_data:
            code = course.get("code", "").split(" - Group")[0]
            unique_codes.add(code)
        
        return CoursesResponse(
            courses=[Course(**c) for c in courses_data],
            count=len(courses_data),
            unique_codes=len(unique_codes),
            last_updated=last_updated
        )
    
    return CoursesResponse(
        courses=[],
        count=0,
        unique_codes=0,
        last_updated=None
    )


@app.post("/api/schedules/generate", response_model=GenerateSchedulesResponse)
async def generate_schedules(request: GenerateSchedulesRequest):
    """Generate schedule combinations from selected courses"""
    try:
        print(f"\n[SCHEDULE GENERATE] Request: {request.course_codes}, filename: {request.json_filename}")
        
        # Load courses
        courses_data = load_courses_from_file(request.json_filename)
        
        if not courses_data:
            print(f"[ERROR] No courses data found for filename: {request.json_filename}")
            raise HTTPException(status_code=404, detail="No courses data found")
        
        print(f"\n{'='*70}")
        print(f"[SCHEDULE GENERATION] Starting with {len(request.course_codes)} requested courses")
        print(f"{'='*70}")
        
        # Filter out DISSOLVED courses and group by code
        courses_by_code = {}
        for course in courses_data:
            status = course.get("status", "").upper()
            if status == "DISSOLVED":
                continue
            
            code = course.get("code", "").split(" - Group")[0]
            if code not in courses_by_code:
                courses_by_code[code] = []
            courses_by_code[code].append(course)
        
        print(f"[INFO] Loaded {len(courses_by_code)} unique course codes from database\n")
        
        # Filter to selected courses only
        selected_dict = {}
        for code in request.course_codes:
            if code in courses_by_code:
                selected_dict[code] = courses_by_code[code]
                # Log available sections for debugging
                print(f"[COURSE: {code}] - {len(courses_by_code[code])} sections:")
                for i, section in enumerate(courses_by_code[code], 1):
                    sched = section.get('schedule', 'TBA')
                    status_val = section.get('status', 'UNKNOWN')
                    enrolled = section.get('enrolled', '?/?')
                    group = section.get('code', '').split(' - ')[-1]
                    print(f"  [{i:2d}] {group:10s} | {sched:25s} | {status_val:15s} | Enrolled: {enrolled}")
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Course {code} not found in loaded data"
                )
        
        # Generate combinations
        print(f"\n{'='*70}")
        print(f"[GENERATION] Building permutations...")
        print(f"{'='*70}")
        
        start_time = time.time()
        # Enable debug if no results expected
        debug_mode = len(selected_dict) > 1
        
        try:
            combinations_raw = generate_schedule_combinations(
                selected_dict,
                max_combinations=request.max_combinations,
                debug=debug_mode
            )
        except Exception as e:
            print(f"[ERROR] generate_schedule_combinations failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
        
        print(f"\n[RESULT] ✓ Generated {len(combinations_raw)} valid combinations")
        print(f"{'='*70}\n")
        
        # Add status to each combination and ensure no conflicts
        combinations = []
        for i, combo in enumerate(combinations_raw):
            try:
                status_info = get_schedule_status(combo)
                combinations.append(ScheduleCombination(
                    courses=[Course(**c) for c in combo],
                    status=status_info["status"],
                    full_courses=status_info["full_courses"]
                ))
            except Exception as e:
                print(f"[ERROR] Failed to process combination {i}: {str(e)}")
                print(f"[DEBUG] Combo data: {combo}")
                import traceback
                traceback.print_exc()
                raise
        
        elapsed = time.time() - start_time
        
        # Final validation: log if any schedules were filtered out due to unexpected conflicts
        if len(combinations) == 0 and len(selected_dict) > 0:
            import logging
            logging.warning(f"No valid schedules generated for {len(selected_dict)} courses")
        
        return GenerateSchedulesResponse(
            combinations=combinations,
            generation_time=round(elapsed, 3),
            count=len(combinations)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Schedule generation failed: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/available")
async def get_available_json_files():
    """Get list of available JSON course files"""
    try:
        print(f"[FILES] Looking for JSON files in: {JSON_DIR}")
        json_files = [f for f in os.listdir(JSON_DIR) if f.endswith('.json')]
        print(f"[FILES] Found {len(json_files)} files: {json_files}")
        files_info = []
        
        for filename in json_files:
            filepath = os.path.join(JSON_DIR, filename)
            stat = os.stat(filepath)
            files_info.append({
                "filename": filename,
                "path": filepath,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        
        # Sort by modification time (newest first)
        files_info.sort(key=lambda x: x["modified"], reverse=True)
        
        print(f"[FILES] Returning {len(files_info)} file(s)")
        return {
            "files": files_info,
            "count": len(files_info)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/load/{filename}")
async def load_courses_file_endpoint(filename: str):
    """Load courses from a specific JSON file"""
    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        filepath = os.path.join(JSON_DIR, filename)
        
        # Check if file exists
        if not os.path.exists(filepath) or not filepath.endswith('.json'):
            raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
        # Read and parse the JSON file
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract courses data
        courses = data.get('courses', []) if isinstance(data, dict) else data
        if not isinstance(courses, list):
            courses = []
        
        # Get file modification time
        stat = os.stat(filepath)
        last_updated = datetime.fromtimestamp(stat.st_mtime).isoformat()
        
        return CoursesResponse(
            courses=courses,
            count=len(courses),
            unique_codes=len(set(c.get('code', '').split(' - ')[0] for c in courses if isinstance(c, dict) and c.get('code'))),
            last_updated=last_updated
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting ISMIS Course Scheduler API Server")
    print("=" * 60)
    print(f"Server: http://localhost:5000")
    print(f"Docs:   http://localhost:5000/docs")
    print(f"Health: http://localhost:5000/health")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info"
    )

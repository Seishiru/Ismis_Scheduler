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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Vite dev server
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
    
    if filename is None or not os.path.exists(filename):
        return []
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
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
        
        with sync_playwright() as p:
            # Launch browser
            browser = p.chromium.launch(headless=True)
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
        filename = os.path.join(JSON_DIR, f"{period_name}_{request_data['academic_year']}.json")
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(courses_data, f, indent=2, ensure_ascii=False)
        
        # Update status to completed
        scraping_tasks[task_id].status = "completed"
        scraping_tasks[task_id].current_task = "Done!"
        scraping_tasks[task_id].courses = [Course(**c) for c in courses_data]
        
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
        request.dict(),
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
        request.dict(),
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


@app.post("/api/schedules/generate", response_model=GenerateSchedulesResponse)
async def generate_schedules(request: GenerateSchedulesRequest):
    """Generate schedule combinations from selected courses"""
    try:
        # Load courses
        courses_data = load_courses_from_file(request.json_filename)
        
        if not courses_data:
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
        combinations_raw = generate_schedule_combinations(
            selected_dict,
            max_combinations=request.max_combinations,
            debug=debug_mode
        )
        
        print(f"\n[RESULT] ✓ Generated {len(combinations_raw)} valid combinations")
        print(f"{'='*70}\n")
        
        # Add status to each combination and ensure no conflicts
        combinations = []
        for combo in combinations_raw:
            status_info = get_schedule_status(combo)
            combinations.append(ScheduleCombination(
                courses=[Course(**c) for c in combo],
                status=status_info["status"],
                full_courses=status_info["full_courses"]
            ))
        
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/available")
async def get_available_json_files():
    """Get list of available JSON course files"""
    try:
        json_files = [f for f in os.listdir(JSON_DIR) if f.endswith('.json')]
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
        
        return {
            "files": files_info,
            "count": len(files_info)
        }
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

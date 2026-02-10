"""
Pydantic models for API request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class AcademicPeriod(str, Enum):
    """Academic period options"""
    NONE = "NONE"
    FIRST_SEMESTER = "FIRST_SEMESTER"
    SECOND_SEMESTER = "SECOND_SEMESTER"
    SUMMER = "SUMMER"
    FIRST_TRIMESTER = "FIRST_TRIMESTER"
    SECOND_TRIMESTER = "SECOND_TRIMESTER"
    THIRD_TRIMESTER = "THIRD_TRIMESTER"
    TRANSITION_SEMESTER = "TRANSITION_SEMESTER"
    SENIORHIGH_TRANSITION_SEMESTER_1 = "SENIORHIGH_TRANSITION_SEMESTER_1"
    SENIORHIGH_TRANSITION_SEMESTER_2 = "SENIORHIGH_TRANSITION_SEMESTER_2"


class AcademicOption(BaseModel):
    """Academic period option with value and label"""
    value: str
    label: str


class AcademicOptions(BaseModel):
    """Available academic periods and years from ISMIS"""
    academic_periods: List[AcademicOption]
    academic_years: List[str]


class Course(BaseModel):
    """Course data model"""
    code: str
    description: str
    status: str
    teacher: str
    schedule: str
    room: str
    department: str
    enrolled: str


class LoginRequest(BaseModel):
    """Login credentials for ISMIS"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Response from successful login with available options"""
    message: str
    options: AcademicOptions


class ScrapeSpecificRequest(BaseModel):
    """Request to scrape specific courses"""
    username: str
    password: str
    courses: List[str] = Field(..., min_items=1)
    academic_period: str
    academic_year: str
    headless: bool = True


class ScrapeAllRequest(BaseModel):
    """Request to scrape all courses"""
    username: str
    password: str
    academic_period: str
    academic_year: str
    headless: bool = True


class ScrapeResponse(BaseModel):
    """Response from scraping operation"""
    task_id: str
    message: str
    status: str


class ScrapeStatus(BaseModel):
    """Status of a scraping task"""
    task_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: Optional[int] = None
    total: Optional[int] = None
    current_task: Optional[str] = None
    courses: Optional[List[Course]] = None
    error: Optional[str] = None
    saved_file: Optional[str] = None


class GenerateSchedulesRequest(BaseModel):
    """Request to generate schedule combinations"""
    course_codes: List[str] = Field(..., min_items=1)
    max_combinations: int = Field(default=5000, ge=1, le=10000)
    json_filename: Optional[str] = None


class ScheduleCombination(BaseModel):
    """A single schedule combination"""
    courses: List[Course]
    status: str  # "available" or "unavailable"
    full_courses: List[str]


class GenerateSchedulesResponse(BaseModel):
    """Response from schedule generation"""
    combinations: List[ScheduleCombination]
    generation_time: float
    count: int


class CoursesResponse(BaseModel):
    """Response containing list of courses"""
    courses: List[Course]
    count: int
    unique_codes: int
    last_updated: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str
    error_code: Optional[str] = None

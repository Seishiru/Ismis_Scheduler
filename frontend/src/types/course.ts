/**
 * TypeScript type definitions matching the backend models
 */

export type AcademicPeriod =
  | 'NONE'
  | 'FIRST_SEMESTER'
  | 'SECOND_SEMESTER'
  | 'SUMMER'
  | 'FIRST_TRIMESTER'
  | 'SECOND_TRIMESTER'
  | 'THIRD_TRIMESTER'
  | 'TRANSITION_SEMESTER'
  | 'SENIORHIGH_TRANSITION_SEMESTER_1'
  | 'SENIORHIGH_TRANSITION_SEMESTER_2';

export interface Course {
  code: string;
  description: string;
  status: string;
  teacher: string;
  schedule: string;
  room: string;
  department: string;
  enrolled: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  options: AcademicOptions;
}

export interface ScrapeSpecificRequest {
  username: string;
  password: string;
  courses: string[];
  academic_period: string;
  academic_year: string;
}

export interface ScrapeAllRequest {
  username: string;
  password: string;
  academic_period: string;
  academic_year: string;
}

export interface ScrapeResponse {
  task_id: string;
  message: string;
  status: string;
}

export type ScrapeTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScrapeStatus {
  task_id: string;
  status: ScrapeTaskStatus;
  progress?: number;
  total?: number;
  current_task?: string;
  courses?: Course[];
  error?: string;
}

export interface GenerateSchedulesRequest {
  course_codes: string[];
  max_combinations?: number;
  json_filename?: string;
}

export interface ScheduleCombination {
  courses: Course[];
  status: 'available' | 'unavailable';
  full_courses: string[];
}

export interface GenerateSchedulesResponse {
  combinations: ScheduleCombination[];
  generation_time: number;
  count: number;
}

export interface CoursesResponse {
  courses: Course[];
  count: number;
  unique_codes: number;
}

export interface JSONFile {
  filename: string;
  path: string;
  size: number;
  modified: string;
}

export interface AvailableFilesResponse {
  files: JSONFile[];
  count: number;
}

export interface ErrorResponse {
  detail: string;
  error_code?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  active_tasks: number;
}

export interface APIInfo {
  name: string;
  version: string;
  status: string;
  endpoints: Record<string, string>;
}

export interface AcademicOption {
  value: string;
  label: string;
}

export interface AcademicOptions {
  academic_periods: AcademicOption[];
  academic_years: string[];
}

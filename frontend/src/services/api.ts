/**
 * API Client for ISMIS Course Scheduler Backend
 */
import {
  LoginRequest,
  LoginResponse,
  ScrapeSpecificRequest,
  ScrapeAllRequest,
  ScrapeResponse,
  ScrapeStatus,
  GenerateSchedulesRequest,
  GenerateSchedulesResponse,
  CoursesResponse,
  AvailableFilesResponse,
  HealthResponse,
  APIInfo,
  AcademicOptions,
} from '../types/course';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new APIError(
      error.detail || 'Request failed',
      response.status,
      error
    );
  }
  return response.json();
}

export const courseAPI = {
  /**
   * Get API info and health status
   */
  async getInfo(): Promise<APIInfo> {
    const response = await fetch(`${API_BASE_URL}/`);
    return handleResponse<APIInfo>(response);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(response);
  },

  /**
   * Get academic period and year options (static fallback)
   */
  async getAcademicOptions(): Promise<AcademicOptions> {
    const response = await fetch(`${API_BASE_URL}/api/options`);
    return handleResponse<AcademicOptions>(response);
  },

  /**
   * Login to ISMIS and get available academic options
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<LoginResponse>(response);
  },

  /**
   * Scrape specific courses
   */
  async scrapeSpecificCourses(
    request: ScrapeSpecificRequest
  ): Promise<ScrapeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/scrape/specific`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<ScrapeResponse>(response);
  },

  /**
   * Scrape all courses
   */
  async scrapeAllCourses(request: ScrapeAllRequest): Promise<ScrapeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/scrape/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<ScrapeResponse>(response);
  },

  /**
   * Get scraping task status
   */
  async getScrapeStatus(taskId: string): Promise<ScrapeStatus> {
    const response = await fetch(`${API_BASE_URL}/api/scrape/status/${taskId}`);
    return handleResponse<ScrapeStatus>(response);
  },

  /**
   * Poll scraping task until completion
   */
  async pollScrapeStatus(
    taskId: string,
    onProgress?: (status: ScrapeStatus) => void,
    interval: number = 1000
  ): Promise<ScrapeStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getScrapeStatus(taskId);
          
          onProgress?.(status);

          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new APIError(status.error || 'Scraping failed'));
          } else {
            // Continue polling
            setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },

  /**
   * Get scraped courses
   */
  async getCourses(filename?: string): Promise<CoursesResponse> {
    const url = filename
      ? `${API_BASE_URL}/api/courses?filename=${encodeURIComponent(filename)}`
      : `${API_BASE_URL}/api/courses`;
    
    const response = await fetch(url);
    return handleResponse<CoursesResponse>(response);
  },

  /**
   * Get cached courses (instant loading, no scraping)
   */
  async getCachedCourses(): Promise<CoursesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/courses/cached`);
    return handleResponse<CoursesResponse>(response);
  },

  /**
   * Generate schedule combinations
   */
  async generateSchedules(
    request: GenerateSchedulesRequest
  ): Promise<GenerateSchedulesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/schedules/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<GenerateSchedulesResponse>(response);
  },

  /**
   * Get available JSON files
   */
  async getAvailableFiles(): Promise<AvailableFilesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/schedules/available`);
    return handleResponse<AvailableFilesResponse>(response);
  },

  /**
   * Load courses from a specific file
   */
  async loadCoursesFromFile(filename: string): Promise<CoursesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/schedules/load/${encodeURIComponent(filename)}`);
    return handleResponse<CoursesResponse>(response);
  },
};

export { APIError };
export default courseAPI;

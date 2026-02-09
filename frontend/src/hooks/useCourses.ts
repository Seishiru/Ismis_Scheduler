/**
 * React hooks for managing course data and API interactions
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import courseAPI, { APIError } from '../services/api';
import type {
  Course,
  ScrapeSpecificRequest,
  ScrapeAllRequest,
  ScrapeStatus,
  GenerateSchedulesRequest,
  ScheduleCombination,
  AvailableFilesResponse,
} from '../types/course';

/**
 * Hook for managing scraped courses
 */
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (filename?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await courseAPI.getCourses(filename);
      setCourses(response.courses);
      return response;
    } catch (err) {
      const errorMsg = err instanceof APIError ? err.message : 'Failed to load courses';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    courses,
    loading,
    error,
    loadCourses,
    setCourses,
  };
}

/**
 * Hook for scraping courses
 */
export function useScraper() {
  const [isScraping, setScraping] = useState(false);
  const [progress, setProgress] = useState<ScrapeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const scrapeSpecific = useCallback(
    async (
      username: string,
      password: string,
      courses: string[],
      academicPeriod: string = 'SECOND_SEMESTER',
      academicYear: string = '2024-2025'
    ): Promise<Course[] | null> => {
      setScraping(true);
      setIsPolling(true);
      setError(null);
      setProgress(null);

      try {
        // Build request with provided fields
        const request: ScrapeSpecificRequest = {
          username,
          password,
          courses,
          academic_period: academicPeriod as any,
          academic_year: academicYear,
        };

        // Start scraping task
        const startResponse = await courseAPI.scrapeSpecificCourses(request);
        toast.info('Scraping started...', {
          description: 'Please wait while we fetch course data.',
        });

        // Poll for status
        const finalStatus = await courseAPI.pollScrapeStatus(
          startResponse.task_id,
          (status) => {
            setProgress(status);
            if (status.current_task) {
              toast.loading(status.current_task, { id: 'scrape-progress' });
            }
          }
        );

        toast.dismiss('scrape-progress');
        
        if (finalStatus.courses) {
          toast.success('Scraping completed!', {
            description: `Found ${finalStatus.courses.length} course sections.`,
          });
          return finalStatus.courses;
        }
        
        return null;
      } catch (err) {
        const errorMsg = err instanceof APIError ? err.message : 'Scraping failed';
        setError(errorMsg);
        toast.error('Scraping failed', { description: errorMsg });
        return null;
      } finally {
        setScraping(false);
        setIsPolling(false);
        toast.dismiss('scrape-progress');
      }
    },
    []
  );

  const scrapeAll = useCallback(
    async (
      username: string,
      password: string,
      academicPeriod: string = 'SECOND_SEMESTER',
      academicYear: string = '2024-2025'
    ): Promise<Course[] | null> => {
      setScraping(true);
      setIsPolling(true);
      setError(null);
      setProgress(null);

      try {
        // Build request with provided fields
        const request: ScrapeAllRequest = {
          username,
          password,
          academic_period: academicPeriod as any,
          academic_year: academicYear,
        };

        const startResponse = await courseAPI.scrapeAllCourses(request);
        toast.info('Scraping all courses...', {
          description: 'This may take a few minutes.',
        });

        const finalStatus = await courseAPI.pollScrapeStatus(
          startResponse.task_id,
          (status) => {
            setProgress(status);
            if (status.current_task) {
              toast.loading(status.current_task, { id: 'scrape-progress' });
            }
          }
        );

        toast.dismiss('scrape-progress');
        
        if (finalStatus.courses) {
          toast.success('Scraping completed!', {
            description: `Found ${finalStatus.courses.length} course sections.`,
          });
          return finalStatus.courses;
        }
        
        return null;
      } catch (err) {
        const errorMsg = err instanceof APIError ? err.message : 'Scraping failed';
        setError(errorMsg);
        toast.error('Scraping failed', { description: errorMsg });
        return null;
      } finally {
        setScraping(false);
        setIsPolling(false);
        toast.dismiss('scrape-progress');
      }
    },
    []
  );

  const cancelPolling = useCallback(() => {
    setIsPolling(false);
    setProgress(null);
  }, []);

  return {
    scrapeAll,
    scrapeSpecific,
    status: progress,
    isScraping,
    isPolling,
    error,
    cancelPolling,
  };
}

/**
 * Hook for generating schedules
 */
export function useScheduleGenerator() {
  const [schedules, setSchedules] = useState<ScheduleCombination[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number>(0);

  const generateSchedules = useCallback(
    async (request: GenerateSchedulesRequest): Promise<boolean> => {
      setGenerating(true);
      setError(null);

      try {
        toast.loading('Generating schedules...', { id: 'generate-schedules' });
        
        const response = await courseAPI.generateSchedules(request);
        
        setSchedules(response.combinations);
        setGenerationTime(response.generation_time);

        toast.dismiss('generate-schedules');
        
        if (response.count === 0) {
          toast.warning('No valid schedules found', {
            description: 'The selected courses have time conflicts.',
          });
        } else {
          toast.success('Schedules generated!', {
            description: `Found ${response.count} valid combination(s) in ${response.generation_time.toFixed(2)}s.`,
          });
        }

        return true;
      } catch (err) {
        const errorMsg = err instanceof APIError ? err.message : 'Failed to generate schedules';
        setError(errorMsg);
        toast.dismiss('generate-schedules');
        toast.error('Generation failed', { description: errorMsg });
        return false;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  return {
    schedules,
    generating,
    error,
    generationTime,
    generateSchedules,
    setSchedules,
  };
}

/**
 * Hook for available JSON files
 */
export function useAvailableFiles() {
  const [files, setFiles] = useState<AvailableFilesResponse['files']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await courseAPI.getAvailableFiles();
      setFiles(response.files);
      return response;
    } catch (err) {
      const errorMsg = err instanceof APIError ? err.message : 'Failed to load files';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    loading,
    error,
    loadFiles,
  };
}

/**
 * Hook for API health check
 */
export function useAPIHealth() {
  const [isHealthy, setIsHealthy] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      await courseAPI.healthCheck();
      setIsHealthy(true);
      return true;
    } catch {
      setIsHealthy(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    isHealthy,
    checking,
    checkHealth,
  };
}

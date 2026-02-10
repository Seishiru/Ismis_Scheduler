import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { FileJson, Calendar, HardDrive, Loader2, AlertCircle } from 'lucide-react';
import courseAPI from '../services/api';
import type { Course, JSONFile } from '../types/course';

interface FilesViewProps {
  onSelectCourses: (courses: Course[], scrapeType: 'specific' | 'all', filename: string) => void;
  refreshTrigger?: number;
}

export function FilesView({ onSelectCourses, refreshTrigger = 0 }: FilesViewProps) {
  const [files, setFiles] = useState<JSONFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<JSONFile | null>(null);
  const [loadedFile, setLoadedFile] = useState<JSONFile | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);

  // Initial load when component mounts
  useEffect(() => {
    console.log('[FilesView] Component mounted, refreshTrigger:', refreshTrigger);
    if (refreshTrigger > lastRefreshTrigger) {
      console.log('[FilesView] Mount: refreshTrigger changed, auto-loading newest file');
      setLastRefreshTrigger(refreshTrigger);
      fetchFilesAndAutoLoad();
    } else {
      console.log('[FilesView] Mount: normal fetch');
      fetchFiles();
    }
  }, []);

  // Refresh files when refreshTrigger changes (e.g., after scraping completes)
  useEffect(() => {
    console.log('[FilesView] refreshTrigger changed:', refreshTrigger, 'last:', lastRefreshTrigger);
    if (refreshTrigger > lastRefreshTrigger && refreshTrigger > 0) {
      console.log('[FilesView] Triggering fetchFilesAndAutoLoad...');
      setLastRefreshTrigger(refreshTrigger);
      fetchFilesAndAutoLoad();
    }
  }, [refreshTrigger]);

  const fetchFiles = async () => {
    try {
      console.log('[FilesView] Fetching available files...');
      setLoading(true);
      setError(null);
      const response = await courseAPI.getAvailableFiles();
      console.log('[FilesView] Received files:', response);
      setFiles(response.files || []);
    } catch (err) {
      console.error('[FilesView] Error fetching files:', err);
      setError('Failed to load saved files. ' + (err instanceof Error ? err.message : ''));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesAndAutoLoad = async () => {
    try {
      console.log('[FilesView] fetchFilesAndAutoLoad starting...');
      setLoading(true);
      setError(null);
      const response = await courseAPI.getAvailableFiles();
      console.log('[FilesView] fetchFilesAndAutoLoad got response:', response);
      const filesList = response.files || [];
      setFiles(filesList);
      
      // Auto-select and load the newest file
      if (filesList.length > 0) {
        const newestFile = filesList[0]; // Files are already sorted by modification time (newest first)
        console.log('[FilesView] Auto-selecting newest file:', newestFile.filename);
        setSelectedFile(newestFile);
        
        // Auto-load it
        setTimeout(async () => {
          try {
            console.log('[FilesView] Auto-loading file:', newestFile.filename);
            const coursesResponse = await courseAPI.loadCoursesFromFile(newestFile.filename);
            // Detect scrape type from filename suffix
            const scrapeType = newestFile.filename.toLowerCase().includes('_all.json') ? 'all' : 'specific';
            console.log('[FilesView] Loaded', coursesResponse.courses.length, 'courses, type:', scrapeType);
            onSelectCourses(coursesResponse.courses, scrapeType, newestFile.filename);
            setLoadedFile(newestFile);
          } catch (err) {
            console.error('[FilesView] Auto-load error:', err);
            setError('Failed to auto-load newest file. ' + (err instanceof Error ? err.message : ''));
          }
        }, 100);
      }
    } catch (err) {
      console.error('[FilesView] fetchFilesAndAutoLoad error:', err);
      setError('Failed to load saved files. ' + (err instanceof Error ? err.message : ''));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSelected = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setLoadingCourses(true);
      setError(null);
      
      // Load the file data
      const response = await courseAPI.loadCoursesFromFile(selectedFile.filename);
      
      // Determine scrape type based on filename suffix
      const scrapeType = selectedFile.filename.toLowerCase().includes('_all.json') ? 'all' : 'specific';
      
      onSelectCourses(response.courses, scrapeType, selectedFile.filename);
      setLoadedFile(selectedFile);
      
      // Show success message
      console.log(`Loaded ${response.courses.length} courses from ${selectedFile.filename}`);
    } catch (err) {
      setError('Failed to load file. ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoadingCourses(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Saved Files</h1>
        <p className="text-muted-foreground mt-1">
          View and switch between your scraped course datasets
        </p>
      </div>

      {/* Refresh Button */}
      <Button
        onClick={fetchFiles}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Refresh Files
      </Button>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Error</p>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Current Status */}
      {loadedFile ? (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                ✓ Currently Loaded
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">{loadedFile.filename}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              No data loaded. Select a file below to get started.
            </p>
          </div>
        </Card>
      )}

      {/* Files List */}
      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--usc-green)]" />
            <p className="text-muted-foreground">Loading files...</p>
          </div>
        </Card>
      ) : files.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <FileJson className="w-12 h-12 text-muted-foreground opacity-50" />
            <div>
              <p className="font-semibold text-foreground">No files found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use the Scraper tab to create your first course dataset.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div>
          {/* Selection List */}
          <div className="space-y-2 mb-4">
            {files.map((file) => {
              const isSelected = selectedFile?.filename === file.filename;
              const isLoaded = loadedFile?.filename === file.filename;
              const isAllCourses = file.filename.toLowerCase().includes('_all.json');
              const scrapeTypeLabel = isAllCourses ? 'All Courses' : 'Specific Courses';
              const scrapeTypeBadge = isAllCourses ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
              
              return (
                <label
                  key={file.filename}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--usc-green)] bg-green-50 dark:bg-green-900/10'
                      : 'border-border hover:border-[var(--usc-green)]/50'
                  }`}
                >
                  {/* Radio Button */}
                  <input
                    type="radio"
                    name="file-select"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedFile(file);
                      setError(null);
                    }}
                    className="mt-1 w-4 h-4 accent-[var(--usc-green)]"
                  />

                  {/* File Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{file.filename}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${scrapeTypeBadge}`}>
                            {scrapeTypeLabel}
                          </span>
                        </div>
                      </div>
                      {isLoaded && (
                        <span className="text-xs font-bold text-[var(--usc-green)] bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                          LOADED
                        </span>
                      )}
                    </div>

                    {/* File Details */}
                    <div className="grid grid-cols-3 gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(file.modified)}</span>
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Load Button */}
          <Button
            onClick={handleLoadSelected}
            disabled={!selectedFile || loadingCourses}
            className="w-full gap-2"
            style={{
              backgroundColor: selectedFile ? 'var(--usc-green)' : '#d1d5db',
              color: 'white'
            }}
          >
            {loadingCourses ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>Load Selected File</>
            )}
          </Button>
        </div>
      )}

      {/* Info Section */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="space-y-2 text-sm text-blue-900 dark:text-blue-300">
          <p className="font-semibold">About Saved Files</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Each scrape from the Scraper tab creates a new file</li>
            <li>Files are stored in the generated/json/ directory</li>
            <li>Load a file to switch between different course datasets</li>
            <li>You can build schedules from Specific Courses but not from All Courses data</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

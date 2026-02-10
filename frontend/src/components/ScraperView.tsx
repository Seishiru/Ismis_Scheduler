import { useState, useEffect } from 'react';
import { Play, Square, CheckCircle, Database, Mail, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useScraper } from '../hooks/useCourses';
import courseAPI from '../services/api';
import type { Course, AcademicOptions } from '../types/course';

interface ScraperViewProps {
  onCoursesScraped: (courses: Course[]) => void;
}

export function ScraperView({ onCoursesScraped }: ScraperViewProps) {
  const [email, setEmail] = useState(() => sessionStorage.getItem('ismis_email') || '');
  const [password, setPassword] = useState('');
  const [courseCodes, setCourseCodes] = useState('');
  const [academicPeriod, setAcademicPeriod] = useState(() => sessionStorage.getItem('ismis_academic_period') || '');
  const [academicYear, setAcademicYear] = useState(() => sessionStorage.getItem('ismis_academic_year') || '');
  const [options, setOptions] = useState<AcademicOptions | null>(() => {
    const stored = sessionStorage.getItem('ismis_options');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('ismis_logged_in') === 'true');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const { scrapeAll, scrapeSpecific, status, isPolling, cancelPolling } = useScraper();

  // Load static options on mount as fallback
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const data = await courseAPI.getAcademicOptions();
        console.log('Loaded fallback academic options:', data);
      } catch (err) {
        console.error('Failed to load academic options:', err);
      }
    };
    loadOptions();
  }, []);

  // Handle login and fetch real options
  const handleLogin = async () => {
    if (!email || !password) {
      setLoginError('Please enter your ISMIS credentials');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await courseAPI.login({ username: email, password });
      console.log('Login successful:', response);
      
      setOptions(response.options);
      setIsLoggedIn(true);
      
      // Persist login state to sessionStorage
      sessionStorage.setItem('ismis_logged_in', 'true');
      sessionStorage.setItem('ismis_email', email);
      sessionStorage.setItem('ismis_options', JSON.stringify(response.options));
      
      // Set first option as default if available
      if (response.options.academic_periods && response.options.academic_periods.length > 0) {
        const firstPeriod = response.options.academic_periods[0].value;
        setAcademicPeriod(firstPeriod);
        sessionStorage.setItem('ismis_academic_period', firstPeriod);
      }
      if (response.options.academic_years && response.options.academic_years.length > 0) {
        const firstYear = response.options.academic_years[0];
        setAcademicYear(firstYear);
        sessionStorage.setItem('ismis_academic_year', firstYear);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setOptions(null);
    setAcademicPeriod('');
    setAcademicYear('');
    setLoginError(null);
    
    // Clear sessionStorage
    sessionStorage.removeItem('ismis_logged_in');
    sessionStorage.removeItem('ismis_email');
    sessionStorage.removeItem('ismis_options');
    sessionStorage.removeItem('ismis_academic_period');
    sessionStorage.removeItem('ismis_academic_year');
  };

  const handleAcademicPeriodChange = (value: string) => {
    setAcademicPeriod(value);
    sessionStorage.setItem('ismis_academic_period', value);
  };

  const handleAcademicYearChange = (value: string) => {
    setAcademicYear(value);
    sessionStorage.setItem('ismis_academic_year', value);
  };

  // Notify parent when scraping completes
  useEffect(() => {
    if (status?.status === 'completed' && status?.courses) {
      onCoursesScraped(status.courses);
    }
  }, [status, onCoursesScraped]);

  const handleScrapeAll = async () => {
    if (!email || !password) {
      alert('Please enter your ISMIS credentials');
      return;
    }

    if (!academicPeriod || !academicYear || academicPeriod === 'NONE' || academicYear === 'NONE') {
      alert('Please select both Academic Period and Academic Year before scraping');
      return;
    }

    await scrapeAll(email, password, academicPeriod, academicYear);
  };

  const handleScrapeSpecific = async () => {
    if (!email || !password) {
      alert('Please enter your ISMIS credentials');
      return;
    }

    if (!academicPeriod || !academicYear || academicPeriod === 'NONE' || academicYear === 'NONE') {
      alert('Please select both Academic Period and Academic Year before scraping');
      return;
    }

    if (!courseCodes.trim()) {
      alert('Please enter at least one course code');
      return;
    }

    const codes = courseCodes.split(',').map(c => c.trim()).filter(Boolean);
    await scrapeSpecific(email, password, codes, academicPeriod, academicYear);
  };

  const renderProgressBar = (percent: number) => {
    const totalBlocks = 30;
    const filledBlocks = Math.floor((percent / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    return (
      <div className="font-mono text-sm">
        <span className="text-[var(--usc-green)]">{'█'.repeat(filledBlocks)}</span>
        <span className="text-gray-300">{'-'.repeat(emptyBlocks)}</span>
      </div>
    );
  };

  const isRunning = isPolling || status?.status === 'running';
  const progress = status?.progress || 0;
  const currentTask = status?.current_task || '';
  const coursesCount = status?.courses?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Course Scraper</h1>
        <p className="text-muted-foreground mt-1">Scrape course data from USC ISMIS</p>
      </div>

      {!isLoggedIn ? (
        /* Login Card */
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Login to ISMIS</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your credentials to retrieve available academic periods and years
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@usc.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={isLoggingIn}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your ISMIS password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={isLoggingIn}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                {loginError}
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={isLoggingIn || !email || !password}
              className="w-full gap-2"
              style={{ 
                backgroundColor: isLoggingIn ? '#6b7280' : 'var(--usc-green)',
                color: 'white'
              }}
            >
              {isLoggingIn ? (
                <>
                  <Square className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Login and Load Options
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        /* Scraping Interface */
        <>
          {/* Credentials Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Logged in as {email}</h3>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="academic-period">Academic Period</Label>
                <Select value={academicPeriod} onValueChange={handleAcademicPeriodChange} disabled={isRunning}>
                  <SelectTrigger id="academic-period">
                    <SelectValue placeholder="Select academic period..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.academic_periods && options.academic_periods.length > 0 ? (
                      options.academic_periods.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        No options available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="academic-year">Academic Year</Label>
                <Select value={academicYear} onValueChange={handleAcademicYearChange} disabled={isRunning}>
                  <SelectTrigger id="academic-year">
                    <SelectValue placeholder="Select academic year..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.academic_years && options.academic_years.length > 0 ? (
                      options.academic_years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        No options available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {(!academicPeriod || !academicYear || academicPeriod === 'NONE' || academicYear === 'NONE') && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-md text-sm">
                  ⚠ Please select both Academic Period and Academic Year before scraping
                </div>
              )}
            </div>
          </Card>

          {/* Control Card */}
          <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Scraping Controls</h3>
            <p className="text-sm text-muted-foreground">Choose what to scrape from ISMIS</p>
          </div>

          {/* Scrape All */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Scrape All Courses</p>
              <p className="text-sm text-muted-foreground">Scrape all available courses for the semester</p>
            </div>
            <Button
              onClick={handleScrapeAll}
              disabled={isRunning || !email || !password || !academicPeriod || !academicYear || academicPeriod === 'NONE' || academicYear === 'NONE'}
              className="gap-2"
              style={{ 
                backgroundColor: (isRunning || !academicPeriod || !academicYear || academicPeriod === 'NONE' || academicYear === 'NONE') ? '#6b7280' : 'var(--usc-green)',
                color: 'white'
              }}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {status?.status === 'completed' ? 'Scrape Again' : 'Scrape All'}
                </>
              )}
            </Button>
          </div>

          {/* Scrape Specific */}
          <div className="border-t pt-6 space-y-3">
            <div>
              <Label htmlFor="courseCodes">Specific Course Codes (Optional)</Label>
              <Input
                id="courseCodes"
                placeholder="e.g., CIS 2106, CS 4206, GE-STS"
                value={courseCodes}
                onChange={(e) => setCourseCodes(e.target.value)}
                disabled={isRunning}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter course codes separated by commas to scrape only specific courses
              </p>
            </div>
            <Button
              onClick={handleScrapeSpecific}
              disabled={isRunning || !email || !password || !courseCodes.trim() || !academicPeriod || !academicYear || academicPeriod === 'NONE' || academicYear === 'NONE'}
              variant="outline"
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {status?.status === 'completed' ? 'Scrape Again (Specific)' : 'Scrape Specific Courses'}
            </Button>
          </div>

          {/* Cancel Button */}
          {isRunning && (
            <Button
              onClick={cancelPolling}
              variant="destructive"
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              Cancel Scraping
            </Button>
          )}
        </div>

        {/* Progress Section */}
        {(isRunning || progress > 0) && (
          <div className="space-y-4 mt-6 pt-6 border-t">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-semibold text-[var(--usc-green)]">
                  {Math.round(progress)}%
                </span>
              </div>
              {renderProgressBar(progress)}
            </div>

            {currentTask && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-[var(--usc-green)] animate-pulse" />
                {currentTask}
              </div>
            )}

            {status?.status === 'failed' && status?.error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error: {status.error}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Progress Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Progress Details</h3>
        <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
          {!currentTask && progress === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active scraping. Start scraping to see progress.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-900 dark:text-white/90">
                <span className="text-yellow-500 dark:text-yellow-400">▶</span> Current Task: {currentTask || 'Initializing...'}
              </p>
              <p className="text-gray-900 dark:text-white/90">
                <span className="text-blue-500 dark:text-blue-400">◻</span> Progress: {Math.round(progress)}%
              </p>
              {status?.error && (
                <p className="text-red-600 dark:text-red-400">
                  <span className="text-red-700 dark:text-red-500">✗</span> Error: {status.error}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      {status?.status === 'completed' && coursesCount > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{coursesCount}</p>
                <p className="text-sm text-muted-foreground">Sections Found</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{status?.status === 'completed' ? 'Saved' : 'Processing'}</p>
                <p className="text-sm text-muted-foreground">Course data status</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">100%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
}
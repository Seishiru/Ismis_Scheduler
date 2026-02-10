import { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { Course } from '../types/course';

interface DataTableProps {
  courses: Course[];
}

const getCourseAvailability = (course: Course): 'available' | 'unavailable' | 'unknown' => {
  // Check if dissolved
  if (course.status?.toUpperCase() === 'DISSOLVED') {
    return 'unavailable';
  }

  // Parse enrolled string (e.g., "26/27")
  const match = course.enrolled?.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    const enrolled = parseInt(match[1], 10);
    const capacity = parseInt(match[2], 10);
    
    if (enrolled >= capacity) {
      return 'unavailable';
    }
    return 'available';
  }

  return 'unknown';
};

export function DataTable({ courses }: DataTableProps) {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideFullCourses, setHideFullCourses] = useState(false);
  const [hideDissolvedCourses, setHideDissolvedCourses] = useState(false);

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    
    const query = searchQuery.toLowerCase();
    return courses.filter(course => 
      course.code?.toLowerCase().includes(query) ||
      course.description?.toLowerCase().includes(query) ||
      course.teacher?.toLowerCase().includes(query) ||
      course.room?.toLowerCase().includes(query) ||
      course.schedule?.toLowerCase().includes(query) ||
      course.department?.toLowerCase().includes(query)
    );
  }, [courses, searchQuery]);

  const visibleCourses = useMemo(() => {
    return filteredCourses.filter((course) => {
      const isDissolved = course.status?.toUpperCase() === 'DISSOLVED';
      const match = course.enrolled?.match(/(\d+)\s*\/\s*(\d+)/);
      const isFull = match ? parseInt(match[1], 10) >= parseInt(match[2], 10) : false;

      if (hideDissolvedCourses && isDissolved) return false;
      if (hideFullCourses && isFull) return false;
      return true;
    });
  }, [filteredCourses, hideDissolvedCourses, hideFullCourses]);

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: 'var(--usc-green)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Scraped Course Data</h2>
            <Button
              onClick={() => setShowDetailedView(!showDetailedView)}
              size="sm"
              variant="secondary"
              className="gap-2"
            >
              {showDetailedView ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Details
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-full-courses"
                checked={hideFullCourses}
                onCheckedChange={(checked) => setHideFullCourses(Boolean(checked))}
                className="border-white/40"
              />
              <Label htmlFor="hide-full-courses" className="text-white/90 text-sm cursor-pointer">
                Hide Full
              </Label>
              <Checkbox
                id="hide-dissolved-courses"
                checked={hideDissolvedCourses}
                onCheckedChange={(checked) => setHideDissolvedCourses(Boolean(checked))}
                className="border-white/40"
              />
              <Label htmlFor="hide-dissolved-courses" className="text-white/90 text-sm cursor-pointer">
                Hide Dissolved
              </Label>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
              />
            </div>
            <p className="text-white/80 text-sm">
              {visibleCourses.length} of {courses.length} courses
            </p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-semibold">Course Code</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              {showDetailedView && (
                <>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Teacher</TableHead>
                </>
              )}
              <TableHead className="font-semibold">Schedule</TableHead>
              <TableHead className="font-semibold">Room</TableHead>
              {showDetailedView && (
                <TableHead className="font-semibold">Department</TableHead>
              )}
              <TableHead className="font-semibold">Enrolled Slots</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showDetailedView ? 8 : 5} className="text-center text-muted-foreground py-8">
                  {courses.length === 0 
                    ? 'No courses scraped yet. Use the scraper to load course data.'
                    : 'No courses match your current filters.'
                  }
                </TableCell>
              </TableRow>
            ) : (
              visibleCourses.map((course, index) => {
                const availability = getCourseAvailability(course);
                const statusStyles = {
                  available: 'bg-green-200 border-black',
                  unavailable: 'bg-red-200 border-black',
                  unknown: 'bg-white border-black'
                };

                return (
                  <TableRow
                    key={`${course.code}-${index}`}
                    className="hover:bg-muted transition-colors"
                  >
                    <TableCell className="font-medium text-[var(--usc-green)]">
                      {course.code}
                    </TableCell>
                    <TableCell>{course.description}</TableCell>
                    {showDetailedView && (
                      <>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            course.status?.toUpperCase() === 'DISSOLVED' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              : course.status?.toUpperCase() === 'REGULAR'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                          }`}>
                            {course.status || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{course.teacher || 'N/A'}</TableCell>
                      </>
                    )}
                    <TableCell className="font-mono text-sm">{course.schedule}</TableCell>
                    <TableCell>{course.room}</TableCell>
                    {showDetailedView && (
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={course.department}>
                        {course.department || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full border ${statusStyles[availability]}`}
                          title={availability === 'available' ? 'Slots available' : availability === 'unavailable' ? 'Full or dissolved' : 'Unknown status'}
                        />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          {course.enrolled}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
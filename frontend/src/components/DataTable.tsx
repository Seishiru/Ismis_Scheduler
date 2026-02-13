import { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Course } from '../types/course';

interface DataTableProps {
  courses: Course[];
  selectedCoursesByCode?: Map<string, Course>;
  onCourseSelect?: (selectedMap: Map<string, Course>) => void;
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

export function DataTable({ courses, selectedCoursesByCode = new Map(), onCourseSelect }: DataTableProps) {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideFullCourses, setHideFullCourses] = useState(false);
  const [hideDissolvedCourses, setHideDissolvedCourses] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Get the base course code (e.g., "CIS 2106N" from "CIS 2106N - Group 1")
  const getBaseCourseCode = (courseCode: string): string => {
    return courseCode.split(' - ')[0];
  };

  const handleRowClick = (course: Course) => {
    if (!onCourseSelect) return;
    
    const baseCode = getBaseCourseCode(course.code);
    const newSelection = new Map(selectedCoursesByCode);
    
    // If clicking the same course, deselect it
    if (newSelection.get(baseCode)?.code === course.code) {
      newSelection.delete(baseCode);
    } else {
      // Select this course for this base code
      newSelection.set(baseCode, course);
    }
    
    onCourseSelect(newSelection);
  };

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

  // Pagination logic
  const totalPages = Math.ceil(visibleCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = useMemo(() => {
    return visibleCourses.slice(startIndex, endIndex);
  }, [visibleCourses, startIndex, endIndex, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleHideFullChange = (checked: boolean) => {
    setHideFullCourses(checked);
    setCurrentPage(1);
  };

  const handleHideDissolvedChange = (checked: boolean) => {
    setHideDissolvedCourses(checked);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: 'var(--usc-green)' }}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h2 className="text-lg md:text-xl font-semibold text-white">Scraped Course Data</h2>
              <Button
                onClick={() => setShowDetailedView(!showDetailedView)}
                size="sm"
                variant="secondary"
                className="gap-2 w-fit"
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
            <p className="text-white/80 text-sm">
              {visibleCourses.length} of {courses.length} courses
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-full-courses"
                  checked={hideFullCourses}
                  onCheckedChange={handleHideFullChange}
                  className="border-white/40"
                />
                <Label htmlFor="hide-full-courses" className="text-white/90 text-sm cursor-pointer">
                  Hide Full
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-dissolved-courses"
                  checked={hideDissolvedCourses}
                  onCheckedChange={handleHideDissolvedChange}
                  className="border-white/40"
                />
                <Label htmlFor="hide-dissolved-courses" className="text-white/90 text-sm cursor-pointer">
                  Hide Dissolved
                </Label>
              </div>
              {selectedCoursesByCode.size > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-px h-5 bg-white/20" />
                  <Checkbox
                    id="unselect-all"
                    checked={false}
                    onCheckedChange={() => onCourseSelect && onCourseSelect(new Map())}
                    className="border-white/40"
                  />
                  <Label htmlFor="unselect-all" className="text-white/90 text-sm cursor-pointer">
                    Unselect All
                  </Label>
                </div>
              )}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
              />
            </div>
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
            {paginatedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showDetailedView ? 8 : 5} className="text-center text-muted-foreground py-8">
                  {courses.length === 0 
                    ? 'No courses scraped yet. Use the scraper to load course data.'
                    : 'No courses match your current filters.'
                  }
                </TableCell>
              </TableRow>
            ) : (
              paginatedCourses.map((course, index) => {
                const availability = getCourseAvailability(course);
                const statusStyles = {
                  available: 'bg-green-200 border-black',
                  unavailable: 'bg-red-200 border-black',
                  unknown: 'bg-white border-black'
                };

                const baseCode = getBaseCourseCode(course.code);
                const isSelected = selectedCoursesByCode.get(baseCode)?.code === course.code;
                
                // Get all unique course codes
                const uniqueCourseCodes = new Set(courses.map(c => getBaseCourseCode(c.code)));
                const allCoursesSelected = selectedCoursesByCode.size === uniqueCourseCodes.size;
                
                // This row is unselectable if:
                // 1. This course's base code is already selected AND this specific section is NOT selected (can't switch sections)
                // 2. OR all courses are selected AND this one isn't selected
                const isOtherSectionOfSelectedCourse = selectedCoursesByCode.has(baseCode) && !isSelected;
                const isUnselectable = isOtherSectionOfSelectedCourse || (allCoursesSelected && !selectedCoursesByCode.has(baseCode));
                const isClickable = onCourseSelect && !isUnselectable;

                let rowClassName = "transition-all duration-200 ";
                if (isSelected) {
                  rowClassName += "bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500 cursor-pointer ";
                } else if (isUnselectable) {
                  rowClassName += "opacity-30 cursor-not-allowed pointer-events-none ";
                } else if (isClickable) {
                  rowClassName += "hover:bg-muted cursor-pointer ";
                } else {
                  rowClassName += "hover:bg-muted ";
                }

                return (
                  <TableRow
                    key={`${course.code}-${index}`}
                    className={rowClassName}
                    onClick={() => isClickable && handleRowClick(course)}
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

      {/* Pagination Controls */}
      {visibleCourses.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-muted/50">
          <div className="flex items-center gap-2">
            <Label htmlFor="items-per-page" className="text-sm whitespace-nowrap">
              Items per page:
            </Label>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger id="items-per-page" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} • Showing {paginatedCourses.length} of {visibleCourses.length} courses
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
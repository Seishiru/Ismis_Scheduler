import { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/card';
import { AlertTriangle, X, Clock, Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import type { Course } from '../types/course';
import { useScheduleGenerator } from '../hooks/useCourses';

interface ScheduledCourse extends Course {
  scheduledId: string;
  day: string;
  startTime: number;
  endTime: number;
}

interface ScheduleBuilderProps {
  draggedCourse: Course | null;
  courses: Course[];
}

export function ScheduleBuilder({ draggedCourse, courses }: ScheduleBuilderProps) {
  const [scheduledCourses, setScheduledCourses] = useState<ScheduledCourse[]>([]);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
  const [showSelection, setShowSelection] = useState(false);
  
  const { generateSchedules, schedules, generating, error: genError } = useScheduleGenerator();

  // Get unique course codes from available courses
  const uniqueCourses = useMemo(() => {
    const courseCodes = new Map<string, Course>();
    courses.forEach(course => {
      const baseCode = course.code.split(' - ')[0];
      if (!courseCodes.has(baseCode)) {
        courseCodes.set(baseCode, course);
      }
    });
    return Array.from(courseCodes.values());
  }, [courses]);

  // Load current schedule into the calendar
  useEffect(() => {
    if (schedules && schedules.length > 0 && currentScheduleIndex < schedules.length) {
      const currentSchedule = schedules[currentScheduleIndex];
      const newScheduledCourses: ScheduledCourse[] = [];

      currentSchedule.courses.forEach(course => {
        const parsed = parseDayTime(course.schedule);
        if (parsed) {
          parsed.days.forEach((courseDay) => {
            const scheduledId = `${course.code}-${courseDay}-${Date.now()}-${Math.random()}`;
            newScheduledCourses.push({
              ...course,
              scheduledId,
              day: courseDay,
              startTime: parsed.startTime,
              endTime: parsed.endTime
            });
          });
        }
      });

      setScheduledCourses(newScheduledCourses);
      checkConflicts(newScheduledCourses);
    }
  }, [currentScheduleIndex, schedules]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  const toggleCourseSelection = (courseCode: string) => {
    const newSelection = new Set(selectedCourses);
    if (newSelection.has(courseCode)) {
      newSelection.delete(courseCode);
    } else {
      newSelection.add(courseCode);
    }
    setSelectedCourses(newSelection);
  };

  const handleGenerateSchedules = async () => {
    if (selectedCourses.size === 0) {
      alert('Please select at least one course to generate schedules.');
      setShowSelection(true);
      return;
    }

    const courseCodes = Array.from(selectedCourses);
    
    const success = await generateSchedules({
      course_codes: courseCodes,
      max_combinations: 100,
    });

    if (success && schedules && schedules.length > 0) {
      setCurrentScheduleIndex(0);
      setShowSelection(false);
    }
  };

  const handlePreviousSchedule = () => {
    setCurrentScheduleIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextSchedule = () => {
    setCurrentScheduleIndex(prev => Math.min((schedules?.length || 1) - 1, prev + 1));
  };

  const parseDayTime = (schedule: string): { days: string[], startTime: number, endTime: number } | null => {
    // Parse formats like "MWF 7:30-8:30" or "TTh 9:00-10:30"
    const match = schedule.match(/([MTWThFSa]+)\s+(\d+):(\d+)-(\d+):(\d+)/);
    if (!match) return null;

    const dayMap: { [key: string]: string } = {
      'M': 'Monday',
      'T': 'Tuesday',
      'W': 'Wednesday',
      'Th': 'Thursday',
      'F': 'Friday',
      'S': 'Saturday',
      'Sa': 'Saturday'
    };

    const dayString = match[1];
    const days: string[] = [];
    
    // Parse day string
    let i = 0;
    while (i < dayString.length) {
      if (i < dayString.length - 1 && dayString.substring(i, i + 2) === 'Th') {
        days.push('Thursday');
        i += 2;
      } else if (i < dayString.length - 1 && dayString.substring(i, i + 2) === 'Sa') {
        days.push('Saturday');
        i += 2;
      } else {
        const char = dayString[i];
        if (dayMap[char]) {
          days.push(dayMap[char]);
        }
        i++;
      }
    }

    const startHour = parseInt(match[2]);
    const startMin = parseInt(match[3]);
    const endHour = parseInt(match[4]);
    const endMin = parseInt(match[5]);

    return {
      days,
      startTime: startHour + startMin / 60,
      endTime: endHour + endMin / 60
    };
  };

  const checkConflicts = (newCourses: ScheduledCourse[]) => {
    const conflictIds = new Set<string>();

    for (let i = 0; i < newCourses.length; i++) {
      for (let j = i + 1; j < newCourses.length; j++) {
        const course1 = newCourses[i];
        const course2 = newCourses[j];

        if (course1.day === course2.day) {
          const hasOverlap = 
            (course1.startTime < course2.endTime && course1.endTime > course2.startTime);
          
          if (hasOverlap) {
            conflictIds.add(course1.scheduledId);
            conflictIds.add(course2.scheduledId);
          }
        }
      }
    }

    setConflicts(conflictIds);
  };

  const handleDrop = (_day: string, _hour: number) => {
    if (!draggedCourse) return;

    const parsed = parseDayTime(draggedCourse.schedule);
    if (!parsed) return;

    const newCourses: ScheduledCourse[] = [];
    
    parsed.days.forEach((courseDay) => {
      const scheduledId = `${draggedCourse.code}-${courseDay}-${Date.now()}`;
      newCourses.push({
        ...draggedCourse,
        scheduledId,
        day: courseDay,
        startTime: parsed.startTime,
        endTime: parsed.endTime
      });
    });

    const updatedCourses = [...scheduledCourses, ...newCourses];
    setScheduledCourses(updatedCourses);
    checkConflicts(updatedCourses);
  };

  const handleRemove = (scheduledId: string) => {
    const course = scheduledCourses.find(c => c.scheduledId === scheduledId);
    if (!course) return;

    // Remove all instances of this course (all days)
    const baseId = scheduledId.split('-').slice(0, -2).join('-');
    const updatedCourses = scheduledCourses.filter(c => !c.scheduledId.startsWith(baseId));
    
    setScheduledCourses(updatedCourses);
    checkConflicts(updatedCourses);
  };

  const getCoursesForSlot = (day: string, hour: number) => {
    return scheduledCourses.filter(course => 
      course.day === day &&
      course.startTime <= hour &&
      course.endTime > hour
    );
  };

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const isPM = h >= 12;
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:00 ${isPM ? 'PM' : 'AM'}`;
  };

  const getCourseHeight = (course: ScheduledCourse) => {
    const duration = course.endTime - course.startTime;
    return `${duration * 64}px`; // 64px per hour (h-16)
  };

  const getCourseTop = (course: ScheduledCourse, hour: number) => {
    const offset = course.startTime - hour;
    return `${offset * 64}px`; // 64px per hour
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Schedule Builder</h1>
          <p className="text-muted-foreground mt-1">
            {showSelection 
              ? 'Select courses to generate optimal schedules' 
              : 'Drag courses from the table to build your schedule or auto-generate optimal schedules'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {scheduledCourses.length > 0 && !showSelection && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[var(--usc-green)]" />
              <span className="font-medium">{scheduledCourses.length} time slots scheduled</span>
            </div>
          )}
          {!showSelection ? (
            <Button
              onClick={() => setShowSelection(true)}
              disabled={courses.length === 0}
              className="gap-2"
              style={{ 
                backgroundColor: courses.length === 0 ? '#6b7280' : 'var(--usc-green)',
                color: 'white'
              }}
            >
              <Sparkles className="w-4 h-4" />
              Auto-Generate Schedules
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSelection(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateSchedules}
                disabled={generating || selectedCourses.size === 0}
                className="gap-2"
                style={{ 
                  backgroundColor: generating || selectedCourses.size === 0 ? '#6b7280' : 'var(--usc-green)',
                  color: 'white'
                }}
              >
                <Sparkles className="w-4 h-4" />
                {generating ? 'Generating...' : `Generate (${selectedCourses.size} selected)`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Course Selection Interface */}
      {showSelection && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Select Courses for Schedule Generation</h3>
          {uniqueCourses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No courses available. Please scrape courses first from the Scraper tab.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {uniqueCourses.map(course => {
                const baseCode = course.code.split(' - ')[0];
                const isSelected = selectedCourses.has(baseCode);
                
                return (
                  <div
                    key={baseCode}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-green-50 dark:bg-green-900/20 border-[var(--usc-green)]' 
                        : 'hover:bg-muted border-border'
                    }`}
                    onClick={() => toggleCourseSelection(baseCode)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCourseSelection(baseCode)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label className="font-semibold text-sm cursor-pointer">
                        {baseCode}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {course.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Generated Schedules Navigation */}
      {!showSelection && schedules && schedules.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-200">
                  Schedule {currentScheduleIndex + 1} of {schedules.length}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {schedules[currentScheduleIndex].status === 'available' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      All courses available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      Some courses are full
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousSchedule}
                disabled={currentScheduleIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextSchedule}
                disabled={currentScheduleIndex === schedules.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {genError && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">Error: {genError}</p>
        </Card>
      )}

      {/* Conflict Alert */}
      {!showSelection && conflicts.size > 0 && (
        <Card className="p-4 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-200">Schedule Conflicts Detected</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {conflicts.size} time slot{conflicts.size > 1 ? 's have' : ' has'} overlapping courses. 
                Review highlighted courses below.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Calendar Grid */}
      {!showSelection && (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-4 bg-muted border-r border-border">
                <span className="font-semibold text-sm text-muted-foreground">Time</span>
              </div>
              {days.map(day => (
                <div key={day} className="p-4 bg-muted border-r border-border last:border-r-0">
                  <span className="font-semibold text-sm" style={{ color: 'var(--usc-green)' }}>
                    {day}
                  </span>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="grid grid-cols-8">
              {/* Time Column */}
              <div className="border-r border-border">
                {hours.map(hour => (
                  <div key={hour} className="h-16 p-2 border-b border-border bg-muted">
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatTime(hour)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {days.map(day => (
                <div key={day} className="border-r border-border last:border-r-0">
                  {hours.map(hour => {
                    const coursesInSlot = getCoursesForSlot(day, hour);
                    const isFirstSlot = coursesInSlot.length > 0 && coursesInSlot[0].startTime === hour;

                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="h-16 border-b border-border hover:bg-muted/50 transition-colors relative"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(day, hour)}
                      >
                        {isFirstSlot && coursesInSlot.map(course => {
                          const hasConflict = conflicts.has(course.scheduledId);
                          
                          return (
                            <div
                              key={course.scheduledId}
                              className={`absolute left-1 right-1 rounded-md p-2 shadow-sm border-l-4 ${
                                hasConflict 
                                  ? 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400' 
                                  : 'bg-green-50 dark:bg-green-900/20 border-[var(--usc-green)]'
                              }`}
                              style={{
                                height: getCourseHeight(course),
                                top: getCourseTop(course, hour),
                                zIndex: 10
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 h-full">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-xs truncate ${
                                    hasConflict ? 'text-red-900 dark:text-red-200' : 'text-[var(--usc-green)]'
                                  }`}>
                                    {course.code.split(' - ')[0]}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {course.room}
                                  </p>
                                  {hasConflict && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                      <span className="text-xs text-red-700 dark:text-red-300 font-medium">Conflict</span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-background/50"
                                  onClick={() => handleRemove(course.scheduledId)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      )}

      {/* Empty State */}
      {!showSelection && scheduledCourses.length === 0 && (!schedules || schedules.length === 0) && (
        <Card className="p-12 text-center border-dashed">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Schedules Generated</h3>
            <p className="text-muted-foreground text-sm">
              Click "Auto-Generate Schedules" above to automatically create optimal schedule combinations,
              or drag and drop courses from the data table to manually build your schedule.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
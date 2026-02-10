import { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/card';
import { AlertTriangle, Clock, Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
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
  courses: Course[];
}

export function ScheduleBuilder({ courses }: ScheduleBuilderProps) {
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

  // Keyboard navigation for schedule combinations
  useEffect(() => {
    if (!schedules || schedules.length === 0 || showSelection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent navigation if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviousSchedule();
      } else if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextSchedule();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [schedules, showSelection, currentScheduleIndex]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const slotHeight = 32; // 30-minute slot height
  const timeSlots = useMemo(() => {
    if (scheduledCourses.length === 0) {
      return Array.from({ length: 26 }, (_, i) => 7 + i * 0.5); // 7:00 AM to 8:00 PM
    }

    const minStart = Math.min(...scheduledCourses.map((course) => course.startTime));
    const maxEnd = Math.max(...scheduledCourses.map((course) => course.endTime));

    let start = Math.floor(minStart * 2) / 2;
    let end = Math.ceil(maxEnd * 2) / 2;

    if (end <= start) {
      end = start + 1;
    }

    const slots: number[] = [];
    for (let time = start; time <= end; time += 0.5) {
      slots.push(Number(time.toFixed(2)));
    }

    return slots;
  }, [scheduledCourses]);

  const courseColors = useMemo(() => {
    const palette = [
      '#FDE2E4', '#E2F0CB', '#CDE7F0', '#FFF1C1', '#E5E3F6',
      '#FAD7C0', '#D6F5E3', '#FCE1F1', '#DCEAF7', '#E8F7D6',
      '#FBE4C9', '#E4E7FF', '#DFF6F0', '#FCEED1', '#E7F0FF',
    ];
    const map = new Map<string, string>();

    scheduledCourses.forEach((course) => {
      const baseCode = course.code.split(' - ')[0];
      if (!map.has(baseCode)) {
        map.set(baseCode, palette[map.size % palette.length]);
      }
    });

    return map;
  }, [scheduledCourses]);

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

  const parseDayTime = (schedule: string): { days: string[]; startTime: number; endTime: number } | null => {
    if (!schedule || /tba/i.test(schedule)) return null;

    const normalized = schedule.trim().replace(/\s+/g, ' ');
    const timeMatch = normalized.match(
      /(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
    );

    if (!timeMatch) {
      console.warn('Failed to parse schedule:', schedule);
      return null;
    }

    const daySection = normalized.slice(0, timeMatch.index).trim();
    if (!daySection) return null;

    const fullDayMap: Record<string, string> = {
      MONDAY: 'Monday',
      MON: 'Monday',
      TUESDAY: 'Tuesday',
      TUE: 'Tuesday',
      WEDNESDAY: 'Wednesday',
      WED: 'Wednesday',
      THURSDAY: 'Thursday',
      THU: 'Thursday',
      TH: 'Thursday',
      FRIDAY: 'Friday',
      FRI: 'Friday',
      SATURDAY: 'Saturday',
      SAT: 'Saturday',
      SUNDAY: 'Sunday',
      SUN: 'Sunday',
    };

    const days: string[] = [];
    const tokens = daySection.split(/[^A-Za-z]+/).filter(Boolean);

    const addCompactDays = (token: string) => {
      const compactMap: Record<string, string> = {
        M: 'Monday',
        T: 'Tuesday',
        W: 'Wednesday',
        R: 'Thursday',
        F: 'Friday',
        S: 'Saturday',
        U: 'Sunday',
      };

      // CRITICAL: Replace "Th" and "TH" with "R" FIRST before processing
      // This ensures "TTh" becomes "TR" (Tuesday + Thursday) not "T" + "TH" (Tuesday + Thursday parsed wrong)
      let compact = token.toUpperCase();
      
      // Replace all variations of "TH" with "R"
      compact = compact.replace(/TH/g, 'R');
      
      // Remove standalone "H" that might remain
      compact = compact.replace(/H/g, '');

      compact.split('').forEach((char) => {
        if (compactMap[char] && !days.includes(compactMap[char])) {
          days.push(compactMap[char]);
        }
      });
    };

    const isCompactNotation = (token: string) => {
      // Check if it's likely compact notation (e.g., "MWF", "TTH", "TTh", "MW")
      // Compact notation is short and contains day letter codes
      const upper = token.toUpperCase();
      
      // Must be 5 chars or less
      if (upper.length > 5) return false;
      
      // Must contain only valid day characters (including "H" for "Th")
      if (!/^[MTWRFSUHmtwrfsuh]+$/i.test(token)) return false;
      
      // Special patterns we recognize as compact
      if (/^(M|T|W|R|F|S|U|TH|TTH|MW|MWF|TR|MTWRF)+$/i.test(upper)) return true;
      
      return true;
    };

    tokens.forEach((token) => {
      const upper = token.toUpperCase();

      // Special cases for Saturday/Sunday abbreviations
      if (upper === 'SA' || upper === 'SAT') {
        if (!days.includes('Saturday')) days.push('Saturday');
        return;
      }
      if (upper === 'SU' || upper === 'SUN') {
        if (!days.includes('Sunday')) days.push('Sunday');
        return;
      }

      // Check if it's compact notation BEFORE trying full day matches
      if (isCompactNotation(upper)) {
        addCompactDays(upper);
        return;
      }

      // Try full day name matching (Monday, Tuesday, etc.)
      const hasFullMatch = upper.match(/(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY|MON|TUE|WED|THU|FRI)/g);
      if (hasFullMatch) {
        hasFullMatch.forEach((match) => {
          const mapped = fullDayMap[match];
          if (mapped && !days.includes(mapped)) {
            days.push(mapped);
          }
        });
        return;
      }

      // Fallback to compact notation
      addCompactDays(upper);
    });

    if (days.length === 0) {
      console.warn('No days parsed from:', schedule);
      return null;
    }

    const startHour = parseInt(timeMatch[1], 10);
    const startMin = parseInt(timeMatch[2], 10);
    const startAmPm = timeMatch[3];
    const endHour = parseInt(timeMatch[4], 10);
    const endMin = parseInt(timeMatch[5], 10);
    const endAmPm = timeMatch[6];

    const to24Hour = (hour: number, ampm?: string) => {
      if (!ampm) return hour;
      const upper = ampm.toUpperCase();
      if (upper === 'AM') return hour === 12 ? 0 : hour;
      if (upper === 'PM') return hour === 12 ? 12 : hour + 12;
      return hour;
    };

    let startHour24 = to24Hour(startHour, startAmPm);
    let endHour24 = to24Hour(endHour, endAmPm);

    if (!startAmPm && !endAmPm) {
      if (startHour24 >= 1 && startHour24 < 8) startHour24 += 12;
      if (endHour24 >= 1 && endHour24 < 8) endHour24 += 12;
    }

    const result = {
      days,
      startTime: Number((startHour24 + startMin / 60).toFixed(2)),
      endTime: Number((endHour24 + endMin / 60).toFixed(2)),
    };

    console.log('Parsed schedule:', {
      input: schedule,
      output: result
    });

    return result;
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

  const getCoursesForSlot = (day: string, hour: number) => {
    return scheduledCourses.filter(course => 
      course.day === day &&
      course.startTime <= hour &&
      course.endTime > hour
    );
  };

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const minutes = hour % 1 === 0.5 ? 30 : 0;
    const isPM = h >= 12;
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  const getCourseHeight = (course: ScheduledCourse) => {
    const duration = course.endTime - course.startTime;
    // Each 30-minute slot = 32px, each hour = 2 slots
    // Add 1px buffer to ensure course extends fully to its ending time boundary
    return `${duration * slotHeight * 2 + 30}px`;
  };

  const getCourseTop = (course: ScheduledCourse, hour: number) => {
    const offset = course.startTime - hour;
    return `${offset * slotHeight * 2}px`;
  };

  const getGroupLabel = (code: string) => {
    const match = code.match(/-\s*Group\s*(\d+)/i);
    return match ? `Group ${match[1]}` : null;
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
              : 'Auto-generate optimal schedule combinations from your selected courses'
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Select Courses for Schedule Generation</h3>
            {uniqueCourses.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCourses.size === uniqueCourses.length && uniqueCourses.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Select all courses
                      const allCodes = new Set(uniqueCourses.map(c => c.code.split(' - ')[0]));
                      setSelectedCourses(allCodes);
                    } else {
                      // Deselect all courses
                      setSelectedCourses(new Set());
                    }
                  }}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Select All ({uniqueCourses.length} courses)
                </Label>
              </div>
            )}
          </div>
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
          <div className="mt-4 flex flex-wrap gap-2">
            {schedules.map((schedule, index) => {
              const isActive = index === currentScheduleIndex;
              const isAvailable = schedule.status === 'available';
              const baseClasses = 'w-9 h-9 rounded-md border text-sm font-semibold transition-colors';
              const stateClasses = isAvailable
                ? 'border-green-600 bg-green-50 text-green-900'
                : 'border-red-600 bg-red-50 text-red-900';
              const activeClasses = isActive ? 'ring-2 ring-offset-2 ring-[var(--usc-green)]' : '';

              return (
                <button
                  key={`schedule-box-${index}`}
                  type="button"
                  onClick={() => setCurrentScheduleIndex(index)}
                  className={`${baseClasses} ${stateClasses} ${activeClasses}`}
                  aria-label={`Schedule option ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
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
                {timeSlots.map((hour) => (
                  <div key={hour} className="p-2 border-b border-border bg-muted" style={{ height: `${slotHeight}px` }}>
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatTime(hour)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {days.map(day => (
                <div key={day} className="border-r border-border last:border-r-0">
                  {timeSlots.map((hour) => {
                    const coursesInSlot = getCoursesForSlot(day, hour);

                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="border-b border-border relative"
                        style={{ height: `${slotHeight}px` }}
                      >
                        {coursesInSlot.map(course => {
                          // Only render the course block at its starting time slot
                          // Use small epsilon for floating point comparison
                          if (Math.abs(course.startTime - hour) > 0.01) return null;

                          const hasConflict = conflicts.has(course.scheduledId);
                          const baseCode = course.code.split(' - ')[0];
                          const courseColor = courseColors.get(baseCode) || '#E2E8F0';
                          
                          return (
                            <div
                              key={course.scheduledId}
                              className={`absolute left-1 right-1 rounded-md p-2 shadow-sm border-l-4 ${
                                hasConflict 
                                  ? 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400' 
                                  : 'text-slate-900'
                              }`}
                              style={{
                                height: getCourseHeight(course),
                                top: getCourseTop(course, hour),
                                zIndex: 10,
                                backgroundColor: hasConflict ? undefined : courseColor,
                                borderLeftColor: hasConflict ? undefined : courseColor
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 h-full">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-xs truncate ${
                                    hasConflict ? 'text-red-900 dark:text-red-200' : 'text-slate-900'
                                  }`}>
                                    {course.code.split(' - ')[0]}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {course.room}
                                  </p>
                                  {getGroupLabel(course.code) && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {getGroupLabel(course.code)}
                                    </p>
                                  )}
                                  {hasConflict && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                      <span className="text-xs text-red-700 dark:text-red-300 font-medium">Conflict</span>
                                    </div>
                                  )}
                                </div>
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
              Click "Auto-Generate Schedules" above to automatically create optimal schedule combinations.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
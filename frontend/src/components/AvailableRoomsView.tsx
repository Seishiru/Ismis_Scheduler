import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { DoorOpen, Clock, MapPin, Search, ChevronLeft, ChevronRight, AlertTriangle, FileJson } from 'lucide-react';
import { Button } from './ui/button';
import type { Course } from '../types/course';
import courseAPI from '../services/api';
import { toast } from 'sonner';

interface AvailableRoomsViewProps {
  courses: Course[];
  scrapeType: 'specific' | 'all' | null;
  currentFilename: string | null;
  onLoadAllData?: (courses: Course[], filename: string, lastUpdated?: string) => void;
}

interface RoomSchedule {
  room: string;
  occupiedSlots: Array<{
    day: string;
    startTime: number;
    endTime: number;
    course: string;
  }>;
}

export function AvailableRoomsView({ courses, scrapeType, onLoadAllData }: AvailableRoomsViewProps) {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [searchRoom, setSearchRoom] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roomsPerPage] = useState(12);
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewRoomsPerPage] = useState(10);
  const [loadingAllData, setLoadingAllData] = useState(false);
  const [availableAllFiles, setAvailableAllFiles] = useState<string[]>([]);

  // Fetch available "all" files on mount
  useEffect(() => {
    const fetchAllFiles = async () => {
      try {
        const response = await courseAPI.getAvailableFiles();
        const allFiles = response.files
          .filter(f => f.filename.toLowerCase().includes('_all.json'))
          .map(f => f.filename);
        setAvailableAllFiles(allFiles);
      } catch (err) {
        console.error('Failed to fetch available files:', err);
      }
    };
    fetchAllFiles();
  }, []);

  // Auto-load all data if we don't have "all" data already
  useEffect(() => {
    if (scrapeType !== 'all' && availableAllFiles.length > 0 && onLoadAllData) {
      const handleAutoLoad = async () => {
        try {
          setLoadingAllData(true);
          // Load the first available "_all.json" file
          const fileToLoad = availableAllFiles[0];
          const response = await courseAPI.loadCoursesFromFile(fileToLoad);
          onLoadAllData(response.courses, fileToLoad, response.last_updated);
          toast.success('Loaded all courses data for accurate room availability', {
            description: `Loaded ${response.courses.length} courses from ${fileToLoad}`
          });
        } catch (err) {
          console.error('Failed to auto-load all courses:', err);
          toast.error('Failed to load all courses data', {
            description: 'Room availability may be incomplete'
          });
        } finally {
          setLoadingAllData(false);
        }
      };
      handleAutoLoad();
    }
  }, [scrapeType, availableAllFiles, onLoadAllData]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  // Helper to format time for display
  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Helper to format decimal time to readable string
  const formatDecimalTime = (decimalTime: number): string => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime % 1) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Parse schedule string to extract day and time info
  const parseSchedule = (schedule: string): any[] => {
    const schedules: any[] = [];
    
    if (!schedule || schedule === 'TBA') return schedules;

    // Example formats: "Sat 07:30 AM - 10:30 AM", "TTh 09:00 AM - 10:30 AM", "F 10:30 AM - 01:30 PM"
    // Pattern: Days followed by Time - Time
    const pattern = /^([A-Za-z]+)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+-\s+(\d{1,2}):(\d{2})\s+(AM|PM)/;
    const match = schedule.match(pattern);

    if (!match) return schedules;

    const dayString = match[1];
    const startHour = parseInt(match[2]);
    const startMin = parseInt(match[3]);
    const startPeriod = match[4];
    const endHour = parseInt(match[5]);
    const endMin = parseInt(match[6]);
    const endPeriod = match[7];

    // Convert to 24-hour format
    let start24Hour = startHour === 12 ? 0 : startHour;
    if (startPeriod === 'PM' && startHour !== 12) start24Hour += 12;
    if (startPeriod === 'AM' && startHour === 12) start24Hour = 0;

    let end24Hour = endHour === 12 ? 0 : endHour;
    if (endPeriod === 'PM' && endHour !== 12) end24Hour += 12;
    if (endPeriod === 'AM' && endHour === 12) end24Hour = 0;

    const startTime = start24Hour + startMin / 60;
    const endTime = end24Hour + endMin / 60;

    // Parse day abbreviations to full names
    const days: string[] = [];
    
    // Handle full day names first
    const fullDayMap: Record<string, string> = {
      'Monday': 'Monday', 'Mon': 'Monday',
      'Tuesday': 'Tuesday', 'Tue': 'Tuesday',
      'Wednesday': 'Wednesday', 'Wed': 'Wednesday',
      'Thursday': 'Thursday', 'Thu': 'Thursday',
      'Friday': 'Friday', 'Fri': 'Friday',
      'Saturday': 'Saturday', 'Sat': 'Saturday',
      'Sunday': 'Sunday', 'Sun': 'Sunday'
    };

    if (fullDayMap[dayString]) {
      days.push(fullDayMap[dayString]);
    } else {
      // Parse abbreviated format like "TTh", "MWF", etc.
      let i = 0;
      while (i < dayString.length) {
        // Check for two-letter combinations first
        if (i < dayString.length - 1) {
          const twoLetter = dayString.substring(i, i + 2);
          if (twoLetter === 'Th') {
            days.push('Thursday');
            i += 2;
            continue;
          } else if (twoLetter === 'Sa') {
            days.push('Saturday');
            i += 2;
            continue;
          } else if (twoLetter === 'Su') {
            days.push('Sunday');
            i += 2;
            continue;
          }
        }
        
        // Single letter abbreviations
        const char = dayString[i];
        if (char === 'M') days.push('Monday');
        else if (char === 'T') days.push('Tuesday');
        else if (char === 'W') days.push('Wednesday');
        else if (char === 'F') days.push('Friday');
        else if (char === 'S') days.push('Saturday');
        
        i++;
      }
    }

    // Create schedule entries for each day
    days.forEach(day => {
      schedules.push({ day, startTime, endTime });
    });

    return schedules;
  };

  // Build room schedules from courses
  const buildRoomSchedules = (): Map<string, RoomSchedule> => {
    const roomMap = new Map<string, RoomSchedule>();

    courses.forEach(course => {
      if (!course.room || course.room === 'TBA') return;

      const schedules = parseSchedule(course.schedule);

      schedules.forEach(({ day, startTime, endTime }) => {
        if (!roomMap.has(course.room)) {
          roomMap.set(course.room, {
            room: course.room,
            occupiedSlots: []
          });
        }

        roomMap.get(course.room)!.occupiedSlots.push({
          day,
          startTime,
          endTime,
          course: `${course.code} - ${course.description}`
        });
      });
    });

    return roomMap;
  };

  // Check if a room is available at a specific time
  const isRoomAvailable = (roomSchedule: RoomSchedule, day: string, time: string): boolean => {
    const [hour, minute] = time.split(':').map(Number);
    const checkTime = hour + minute / 60;

    return !roomSchedule.occupiedSlots.some(slot => 
      slot.day === day && 
      checkTime >= slot.startTime && 
      checkTime < slot.endTime
    );
  };

  // Get available rooms for selected day and time
  const getAvailableRooms = () => {
    const roomSchedules = buildRoomSchedules();
    const available: Array<{ room: string; nextOccupied?: string }> = [];

    roomSchedules.forEach((schedule, room) => {
      if (searchRoom && !room.toLowerCase().includes(searchRoom.toLowerCase())) {
        return;
      }

      if (isRoomAvailable(schedule, selectedDay, selectedTime)) {
        // Find next occupied time
        const [hour, minute] = selectedTime.split(':').map(Number);
        const currentTime = hour + minute / 60;

        const upcomingSlots = schedule.occupiedSlots
          .filter(slot => slot.day === selectedDay && slot.startTime > currentTime)
          .sort((a, b) => a.startTime - b.startTime);

        const nextSlot = upcomingSlots[0];
        const nextOccupied = nextSlot 
          ? formatDecimalTime(nextSlot.startTime)
          : 'End of day';

        available.push({ room, nextOccupied });
      }
    });

    return available.sort((a, b) => a.room.localeCompare(b.room));
  };

  // Get all unique rooms
  const getAllRooms = () => {
    const roomSchedules = buildRoomSchedules();
    return Array.from(roomSchedules.entries())
      .filter(([room]) => !searchRoom || room.toLowerCase().includes(searchRoom.toLowerCase()))
      .sort((a, b) => a[0].localeCompare(b[0]));
  };

  const availableRooms = getAvailableRooms();
  const allRooms = getAllRooms();
  const totalRooms = allRooms.length;
  const occupiedRooms = totalRooms - availableRooms.length;

  // Pagination logic for available rooms
  const totalPages = Math.ceil(availableRooms.length / roomsPerPage);
  const startIndex = (currentPage - 1) * roomsPerPage;
  const endIndex = startIndex + roomsPerPage;
  const paginatedRooms = availableRooms.slice(startIndex, endIndex);

  // Pagination logic for overview
  const totalOverviewPages = Math.ceil(allRooms.length / overviewRoomsPerPage);
  const overviewStartIndex = (overviewPage - 1) * overviewRoomsPerPage;
  const overviewEndIndex = overviewStartIndex + overviewRoomsPerPage;
  const paginatedOverviewRooms = allRooms.slice(overviewStartIndex, overviewEndIndex);

  // Reset to page 1 when filters change
  const handleDayChange = (value: string) => {
    setSelectedDay(value);
    setCurrentPage(1);
  };

  const handleTimeChange = (value: string) => {
    setSelectedTime(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchRoom(value);
    setCurrentPage(1);
    setOverviewPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Available Rooms</h1>
        <p className="text-muted-foreground mt-1">
          Find unoccupied rooms for rest or study based on scraped course data
        </p>
      </div>

      {/* Warning when not using all data */}
      {scrapeType !== 'all' && !loadingAllData && courses.length > 0 && (
        <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-orange-800 dark:text-orange-300">Loading Complete Data</p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                For accurate room availability, the system is automatically loading all courses data from files ending with "_all.json".
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading state for auto-loading all data */}
      {loadingAllData && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Loading all courses data for accurate room availability...
            </p>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Day Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => handleDayChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Time Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <select
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              {timeSlots.map(time => (
                <option key={time} value={time}>{formatTime(time)}</option>
              ))}
            </select>
          </div>

          {/* Room Search */}
          <div>
            <label className="block text-sm font-medium mb-2">Search Room</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchRoom}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="e.g., GLE, NGE, etc."
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Current Filter Info & Stats */}
      {courses.length > 0 && totalRooms > 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Viewing availability for:
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {selectedDay} at {formatTime(selectedTime)}
                  {searchRoom && ` • Searching: "${searchRoom}"`}
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">
                  Available: <span className="font-semibold text-green-600 dark:text-green-400">{availableRooms.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">
                  Occupied: <span className="font-semibold text-red-600 dark:text-red-400">{occupiedRooms}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Total: <span className="font-semibold">{totalRooms}</span>
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Available Rooms List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DoorOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h2 className="text-xl font-semibold">
            Available Now ({availableRooms.length} rooms)
          </h2>
        </div>

        {courses.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-2">No course data available</p>
              <p className="text-sm">Load data from the Saved Files tab or use the Scraper to get started.</p>
            </div>
          </Card>
        ) : totalRooms === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-2">No rooms match your search</p>
              <p className="text-sm">Try adjusting your search filter or clear it to see all rooms.</p>
            </div>
          </Card>
        ) : availableRooms.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-2">No rooms available at this time</p>
              <p className="text-sm">All {totalRooms} rooms are occupied. Try selecting a different time slot.</p>
            </div>
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedRooms.map(({ room, nextOccupied }) => (
                <Card key={room} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-green-600 dark:border-l-green-400">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{room}</h3>
                        <p className="text-xs text-green-600 dark:text-green-400">Available</p>
                      </div>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Until: {nextOccupied}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {availableRooms.length > roomsPerPage && (
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} • Showing {paginatedRooms.length} of {availableRooms.length} rooms
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
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Schedule Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Room Schedule Overview</h2>
          {allRooms.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Showing {overviewStartIndex + 1}-{Math.min(overviewEndIndex, allRooms.length)} of {allRooms.length} rooms
            </span>
          )}
        </div>
        
        {allRooms.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p>No rooms found{searchRoom ? ` matching "${searchRoom}"` : ''}.</p>
            </div>
          </Card>
        ) : (
          <div>
            <div className="space-y-4 mb-6">
              {paginatedOverviewRooms.map(([room, schedule]) => (
              <Card key={room} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-[var(--usc-green)]" />
                  <h3 className="font-semibold text-lg">{room}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({schedule.occupiedSlots.length} scheduled classes)
                  </span>
                </div>

                {/* Weekly Schedule Grid */}
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 gap-2 min-w-[600px]">
                    {days.map(day => (
                      <div key={day} className="text-center">
                        <div className="text-xs font-medium mb-2 text-muted-foreground">
                          {day.substring(0, 3)}
                        </div>
                        <div className="space-y-1">
                          {schedule.occupiedSlots
                            .filter(slot => slot.day === day)
                            .sort((a, b) => a.startTime - b.startTime)
                            .map((slot, idx) => {
                              const startTimeStr = formatDecimalTime(slot.startTime);
                              const endTimeStr = formatDecimalTime(slot.endTime);
                              return (
                                <div
                                  key={idx}
                                  className="text-xs p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-800"
                                  title={`${slot.course}\n${startTimeStr} - ${endTimeStr}`}
                                >
                                  <div className="font-medium">{startTimeStr}</div>
                                  <div className="text-[10px] opacity-75">to {endTimeStr}</div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
            </div>

            {/* Overview Pagination Controls */}
            {allRooms.length > overviewRoomsPerPage && (
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg border">
                <span className="text-sm text-muted-foreground">
                  Page {overviewPage} of {totalOverviewPages} • Showing {paginatedOverviewRooms.length} of {allRooms.length} rooms
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOverviewPage(Math.max(1, overviewPage - 1))}
                    disabled={overviewPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOverviewPage(Math.min(totalOverviewPages, overviewPage + 1))}
                    disabled={overviewPage === totalOverviewPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      {courses.length > 0 && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="space-y-2 text-sm text-green-900 dark:text-green-300">
            <p className="font-semibold flex items-center gap-2">
              <DoorOpen className="w-4 h-4" />
              How to use this feature
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Select a day and time to see which rooms are currently free</li>
              <li>Green cards show available rooms with no scheduled classes at that time</li>
              <li>Use the search box to filter specific buildings or room codes</li>
              <li>The Schedule Overview shows the full week's occupancy for all rooms</li>
              <li>Perfect for finding quiet study spaces or places to rest between classes</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}

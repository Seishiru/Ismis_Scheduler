import { useState } from 'react';
import { Card } from './ui/card';
import { DoorOpen, Clock, MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import type { Course } from '../types/course';

interface AvailableRoomsViewProps {
  courses: Course[];
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

export function AvailableRoomsView({ courses }: AvailableRoomsViewProps) {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [searchRoom, setSearchRoom] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roomsPerPage, setRoomsPerPage] = useState(12);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  // Parse schedule string to extract day and time info
  const parseSchedule = (schedule: string): any[] => {
    const schedules: any[] = [];
    // Example format: "M/W 09:00-10:30" or "TTh 13:00-14:30"
    const dayPattern = /([MTWFS]+(?:Th)?)/g;
    const timePattern = /(\d{2}):(\d{2})-(\d{2}):(\d{2})/g;

    const dayMatches = schedule.match(dayPattern);
    const timeMatches = schedule.match(timePattern);

    if (dayMatches && timeMatches) {
      const dayString = dayMatches[0];
      const days = [];

      // Parse day abbreviations
      if (dayString.includes('M')) days.push('Monday');
      if (dayString.includes('T') && !dayString.includes('Th')) days.push('Tuesday');
      if (dayString.includes('W')) days.push('Wednesday');
      if (dayString.includes('Th')) days.push('Thursday');
      if (dayString.includes('F')) days.push('Friday');
      if (dayString.includes('S')) days.push('Saturday');

      // Parse time
      const timeMatch = timeMatches[0].match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
      if (timeMatch) {
        const startHour = parseInt(timeMatch[1]);
        const startMin = parseInt(timeMatch[2]);
        const endHour = parseInt(timeMatch[3]);
        const endMin = parseInt(timeMatch[4]);

        const startTime = startHour + startMin / 60;
        const endTime = endHour + endMin / 60;

        days.forEach(day => {
          schedules.push({ day, startTime, endTime });
        });
      }
    }

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
          ? `${Math.floor(nextSlot.startTime)}:${String(Math.round((nextSlot.startTime % 1) * 60)).padStart(2, '0')}`
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

  // Pagination logic
  const totalPages = Math.ceil(availableRooms.length / roomsPerPage);
  const startIndex = (currentPage - 1) * roomsPerPage;
  const endIndex = startIndex + roomsPerPage;
  const paginatedRooms = availableRooms.slice(startIndex, endIndex);

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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Available Rooms</h1>
        <p className="text-muted-foreground mt-1">
          Find unoccupied rooms for rest or study based on scraped course data
        </p>
      </div>

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
                <option key={time} value={time}>{time}</option>
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
              <p>No course data available. Please scrape courses first.</p>
            </div>
          </Card>
        ) : availableRooms.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No rooms available at this time. Try a different time slot.</p>
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
        <h2 className="text-xl font-semibold mb-4">Room Schedule Overview</h2>
        
        {allRooms.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p>No rooms found{searchRoom ? ` matching "${searchRoom}"` : ''}.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {allRooms.map(([room, schedule]) => (
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
                            .map((slot, idx) => (
                              <div
                                key={idx}
                                className="text-xs p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-800"
                                title={slot.course}
                              >
                                {Math.floor(slot.startTime)}:{String(Math.round((slot.startTime % 1) * 60)).padStart(2, '0')}-
                                {Math.floor(slot.endTime)}:{String(Math.round((slot.endTime % 1) * 60)).padStart(2, '0')}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

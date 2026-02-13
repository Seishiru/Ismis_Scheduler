import { Card } from './ui/card';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';

export function ConflictsView() {
  const mockConflicts = [
    {
      id: '1',
      courses: [
        { code: 'CIS 2106 - Group 1', time: 'MWF 7:30-8:30', room: 'RM 304' },
        { code: 'CS 4206 - Group 1', time: 'MWF 7:00-8:30', room: 'RM 401' }
      ],
      day: 'Monday, Wednesday, Friday',
      conflictTime: '7:30 AM - 8:30 AM'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">My Conflicts</h1>
        <p className="text-muted-foreground mt-1">Review and resolve schedule conflicts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">0</p>
              <p className="text-sm text-muted-foreground">Active Conflicts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">0</p>
              <p className="text-sm text-muted-foreground">Total Courses</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">100%</p>
              <p className="text-sm text-muted-foreground">Schedule Health</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Conflicts Detected</h3>
          <p className="text-muted-foreground text-sm">
            Your current schedule has no overlapping time slots. 
            Add more courses in the Schedule Builder to check for conflicts.
          </p>
        </div>
      </Card>

      {/* Conflicts List (Hidden when empty) */}
      {mockConflicts.length === 0 && (
        <div className="hidden">
          {mockConflicts.map(conflict => (
            <Card key={conflict.id} className="p-6 border-l-4 border-red-500 dark:border-red-400">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Schedule Conflict</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{conflict.day} • {conflict.conflictTime}</span>
                    </div>
                    <div className="space-y-2">
                      {conflict.courses.map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div>
                            <p className="font-medium">{course.code}</p>
                            <p className="text-sm text-muted-foreground">{course.time}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {course.room}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
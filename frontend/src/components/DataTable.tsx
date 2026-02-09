import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { Course } from '../types/course';

interface DataTableProps {
  courses: Course[];
  onDragStart: (course: Course) => void;
}

export function DataTable({ courses, onDragStart }: DataTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: 'var(--usc-green)' }}>
        <h2 className="text-xl font-semibold text-white">Scraped Course Data</h2>
        <p className="text-white/80 text-sm mt-1">
          {courses.length} course sections available
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-semibold">Course Code</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Schedule</TableHead>
              <TableHead className="font-semibold">Room</TableHead>
              <TableHead className="font-semibold">Enrolled Slots</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No courses scraped yet. Use the scraper to load course data.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course, index) => (
                <TableRow
                  key={`${course.code}-${index}`}
                  className="cursor-move hover:bg-muted transition-colors"
                  draggable
                  onDragStart={() => onDragStart(course)}
                >
                  <TableCell className="font-medium text-[var(--usc-green)]">
                    {course.code}
                  </TableCell>
                  <TableCell>{course.description}</TableCell>
                  <TableCell className="font-mono text-sm">{course.schedule}</TableCell>
                  <TableCell>{course.room}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      {course.enrolled}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
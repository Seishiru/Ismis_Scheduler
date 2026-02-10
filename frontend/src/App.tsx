import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScraperView } from './components/ScraperView';
import { DataTable } from './components/DataTable';
import { ScheduleBuilder } from './components/ScheduleBuilder';
import { ConflictsView } from './components/ConflictsView';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { AvailableRoomsView } from './components/AvailableRoomsView';
import { Toaster } from 'sonner';
import type { Course } from './types/course';
import "./styles/index.css";  

const coursesStorageKey = 'ismis_scraped_courses';

export default function App() {
  const [activeView, setActiveView] = useState('scraper');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [selectedCoursesByCode, setSelectedCoursesByCode] = useState<Map<string, Course>>(new Map());

  const viewOrder = ['scraper', 'schedule', 'rooms', 'conflicts', 'settings', 'about'];

  // Listen for dark mode changes
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      if (event.detail.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    window.addEventListener('themeChange' as any, handleThemeChange);

    return () => {
      window.removeEventListener('themeChange' as any, handleThemeChange);
    };
  }, []);

  // Restore saved courses on first load
  useEffect(() => {
    const storedCourses = localStorage.getItem(coursesStorageKey);
    if (!storedCourses) return;

    try {
      const parsed = JSON.parse(storedCourses);
      if (Array.isArray(parsed)) {
        setCourses(parsed as Course[]);
      }
    } catch {
      localStorage.removeItem(coursesStorageKey);
    }
  }, []);

  // Persist courses to localStorage
  useEffect(() => {
    if (courses.length > 0) {
      localStorage.setItem(coursesStorageKey, JSON.stringify(courses));
    } else {
      localStorage.removeItem(coursesStorageKey);
    }
  }, [courses]);

  // Handle scroll to switch tabs when hovering on left side
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse is in the leftmost 300px of the screen (sidebar + small buffer)
      setIsHoveringLeft(e.clientX < 300);
    };

    const handleWheel = (e: WheelEvent) => {
      if (isHoveringLeft) {
        e.preventDefault();
        
        const currentIndex = viewOrder.indexOf(activeView);
        let newIndex: number;

        if (e.deltaY > 0) {
          // Scroll down - next tab (stop at last)
          newIndex = Math.min(currentIndex + 1, viewOrder.length - 1);
        } else {
          // Scroll up - previous tab (stop at first)
          newIndex = Math.max(currentIndex - 1, 0);
        }

        // Only change if the index actually changed
        if (newIndex !== currentIndex) {
          setActiveView(viewOrder[newIndex]);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [activeView, isHoveringLeft]);

  const handleCoursesScraped = (scrapedCourses: Course[]) => {
    setCourses(scrapedCourses);
    setActiveView('schedule'); // Auto-switch to schedule builder
  };

  return (
    <div className="flex h-screen bg-background">
      <Toaster position="top-right" richColors />
      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          {activeView === 'scraper' && (
            <>
              <ScraperView onCoursesScraped={handleCoursesScraped} />
              {courses.length > 0 && (
                <div className="mt-8">
                  <DataTable 
                    courses={courses} 
                    selectedCoursesByCode={selectedCoursesByCode}
                    onCourseSelect={setSelectedCoursesByCode}
                  />
                </div>
              )}
            </>
          )}

          {activeView === 'schedule' && (
            <div className="space-y-8">
              <ScheduleBuilder 
                courses={courses} 
                selectedCoursesByCode={selectedCoursesByCode}
              />
              <DataTable 
                courses={courses} 
                selectedCoursesByCode={selectedCoursesByCode}
                onCourseSelect={setSelectedCoursesByCode}
              />
            </div>
          )}

          {activeView === 'rooms' && <AvailableRoomsView courses={courses} />}

          {activeView === 'conflicts' && <ConflictsView />}

          {activeView === 'settings' && <SettingsView />}

          {activeView === 'about' && <AboutView />}
        </div>
      </div>
    </div>
  );
}
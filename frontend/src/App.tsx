import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScraperView } from './components/ScraperView';
import { FilesView } from './components/FilesView';
import { DataTable } from './components/DataTable';
import { ScheduleBuilder } from './components/ScheduleBuilder';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { AvailableRoomsView } from './components/AvailableRoomsView';
import { DataStatusHeader } from './components/DataStatusHeader';
import { GuideView } from './components/GuideView';
import { TutorialOverlay } from './components/TutorialOverlay';
import { Toaster } from 'sonner';
import type { Course } from './types/course';
import "./styles/index.css";  

// Removed localStorage keys - all data comes from FilesView file-based storage

export default function App() {
  const [activeView, setActiveView] = useState('scraper');
  const [courses, setCourses] = useState<Course[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [scrapeType, setScrapeType] = useState<'specific' | 'all' | null>(null);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [selectedCoursesByCode, setSelectedCoursesByCode] = useState<Map<string, Course>>(new Map());
  const [isManualScrape, setIsManualScrape] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const viewOrder = ['scraper', 'files', 'schedule', 'rooms', 'guide', 'settings', 'about'];

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

  // Note: No auto-loading from localStorage. Data only comes from:
  // 1. User selects a file in FilesView
  // 2. User completes a scrape in ScraperView

  // Courses are now only persisted in files via FilesView
  // No localStorage persistence

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

  const handleCoursesScraped = (scrapedCourses: Course[], timestamp?: string, scrapeTypeParam?: 'specific' | 'all', savedFilename?: string) => {
    console.log('[App] handleCoursesScraped called with', scrapedCourses.length, 'courses');
    console.log('[App] Saved filename:', savedFilename);
    setCourses(scrapedCourses);
    if (timestamp) {
      setLastUpdated(timestamp);
    }
    if (scrapeTypeParam) {
      setScrapeType(scrapeTypeParam);
    }
    if (savedFilename) {
      setCurrentFilename(savedFilename);
    }
    
    // Refresh file list in FilesView after scraping completes
    console.log('[App] Triggering file refresh...');
    setFileRefreshTrigger(prev => {
      console.log('[App] fileRefreshTrigger:', prev, '->', prev + 1);
      return prev + 1;
    });
    
    // Only auto-switch to schedule if this was a manual scrape
    if (isManualScrape) {
      setActiveView('schedule');
      setIsManualScrape(false); // Reset flag
    }
  };

  return (
    <div id="app-root" className="flex h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay 
          onClose={() => setShowTutorial(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Data Status Header - Visible on all tabs */}
          {activeView !== 'settings' && activeView !== 'about' && (
            <DataStatusHeader lastUpdated={lastUpdated} />
          )}

          {activeView === 'scraper' && (
            <>
              <ScraperView 
                onCoursesScraped={handleCoursesScraped}
                onManualScrape={() => setIsManualScrape(true)}
              />
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

          {activeView === 'files' && (
            <FilesView 
              onSelectCourses={(loadedCourses, scrapeTypeVal, filename, lastUpdated) => {
                setCourses(loadedCourses);
                setScrapeType(scrapeTypeVal);
                setCurrentFilename(filename);
                if (lastUpdated) {
                  setLastUpdated(lastUpdated);
                }
              }}
              refreshTrigger={fileRefreshTrigger}
              currentFilename={currentFilename}
            />
          )}

          {activeView === 'schedule' && (
            <div className="space-y-8">
              <ScheduleBuilder 
                courses={courses} 
                selectedCoursesByCode={selectedCoursesByCode}
                scrapeType={scrapeType}
                currentFilename={currentFilename}
              />
              <DataTable 
                courses={courses} 
                selectedCoursesByCode={selectedCoursesByCode}
                onCourseSelect={setSelectedCoursesByCode}
              />
            </div>
          )}

          {activeView === 'rooms' && (
            <AvailableRoomsView 
              courses={courses} 
              scrapeType={scrapeType}
              currentFilename={currentFilename}
              onLoadAllData={(loadedCourses, filename, lastUpdated) => {
                setCourses(loadedCourses);
                setScrapeType('all');
                setCurrentFilename(filename);
                if (lastUpdated) {
                  setLastUpdated(lastUpdated);
                }
              }}
            />
          )}

          {activeView === 'guide' && (
            <GuideView onStartTutorial={() => setShowTutorial(true)} />
          )}

          {activeView === 'settings' && <SettingsView />}

          {activeView === 'about' && <AboutView />}
        </div>
      </div>
    </div>
  );
}
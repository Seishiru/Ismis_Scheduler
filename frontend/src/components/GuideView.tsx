import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Play, Book, Lightbulb, Zap, Search, Calendar, DoorOpen, Settings } from 'lucide-react';

interface GuideViewProps {
  onStartTutorial: () => void;
}

export function GuideView({ onStartTutorial }: GuideViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">User Guide</h1>
        <p className="text-muted-foreground mt-1">
          Learn how to use USC Course Scheduler effectively
        </p>
      </div>

      {/* Interactive Tutorial */}
      <Card className="p-8 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-[var(--usc-green)]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--usc-green)] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Interactive Tutorial</h2>
          <p className="text-muted-foreground mb-6">
            New here? Take a guided tour! We'll walk you through each feature step-by-step 
            with interactive highlights and explanations.
          </p>
          <Button
            size="lg"
            onClick={onStartTutorial}
            className="gap-2 text-lg px-8 py-6"
            style={{ backgroundColor: 'var(--usc-green)', color: 'white' }}
          >
            <Play className="w-5 h-5" />
            Start Tutorial
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Takes about 2 minutes • 7 steps
          </p>
        </div>
      </Card>

      {/* Quick Start Guide */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--usc-green)]" />
          Quick Start Guide
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--usc-green)] text-white flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Scrape Course Data</h3>
              <p className="text-sm text-muted-foreground">
                Go to the <span className="font-semibold">Scraper</span> tab and log in with your ISMIS credentials. 
                Choose to scrape specific courses or all available courses for the semester.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--usc-green)] text-white flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Access Your Data</h3>
              <p className="text-sm text-muted-foreground">
                Visit the <span className="font-semibold">Saved Files</span> tab to view and load your scraped data. 
                The most recent file is automatically loaded.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--usc-green)] text-white flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Build Your Schedule</h3>
              <p className="text-sm text-muted-foreground">
                In the <span className="font-semibold">Schedule Builder</span>, select your desired courses and 
                generate all possible combinations. Navigate through options to find the perfect schedule!
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Features Overview */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Book className="w-5 h-5 text-[var(--usc-green)]" />
          Features Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5 text-[var(--usc-green)]" />
              <h3 className="font-semibold">Web Scraper</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically extracts course data from ISMIS. Supports both specific courses and full semester scraping.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-[var(--usc-green)]" />
              <h3 className="font-semibold">Schedule Generator</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Generates all possible schedule combinations based on your course selections with automatic conflict detection.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <DoorOpen className="w-5 h-5 text-[var(--usc-green)]" />
              <h3 className="font-semibold">Room Finder</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Find available rooms by day and time. Perfect for studying or taking breaks between classes.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-[var(--usc-green)]" />
              <h3 className="font-semibold">Customization</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Adjust theme, scraper settings, and display preferences to match your workflow.
            </p>
          </div>
        </div>
      </Card>

      {/* Tips & Tricks */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[var(--usc-green)]" />
          Tips & Tricks
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">💡</span>
            <p className="text-sm">
              <span className="font-semibold">Keyboard Navigation:</span> Use ← → or A/D keys to quickly navigate between schedule combinations.
            </p>
          </div>
          
          <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">💡</span>
            <p className="text-sm">
              <span className="font-semibold">Green = Good:</span> Schedules highlighted in green have no time conflicts and all courses available.
            </p>
          </div>
          
          <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">💡</span>
            <p className="text-sm">
              <span className="font-semibold">Filter Available Only:</span> Toggle "Show Available Only" to skip schedules with full courses.
            </p>
          </div>
          
          <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">💡</span>
            <p className="text-sm">
              <span className="font-semibold">Scroll Navigation:</span> Hover on the sidebar and scroll to quickly switch between tabs.
            </p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">How do I get course data?</h3>
            <p className="text-sm text-muted-foreground">
              Use the Scraper tab to log in with your ISMIS credentials and fetch course data. You can scrape specific courses or all available courses.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">What's the difference between "Specific" and "All" courses?</h3>
            <p className="text-sm text-muted-foreground">
              "Specific" scrapes only the courses you're interested in (faster), while "All" scrapes every course offered in the semester (comprehensive, but slower).
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Why can't I generate schedules?</h3>
            <p className="text-sm text-muted-foreground">
              Make sure you've loaded data from the Saved Files tab and selected at least one course in the Schedule Builder.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">How do I save my favorite schedule?</h3>
            <p className="text-sm text-muted-foreground">
              Take a screenshot of your preferred schedule or note down the combination number for future reference.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

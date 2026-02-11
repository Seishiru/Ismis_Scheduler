import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  targetId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to USC Course Scheduler! 🎓',
    description: 'Let me show you around! This tutorial will guide you through all the features step by step. Click Next to continue or Skip to explore on your own.',
    targetId: 'app-root',
    position: 'bottom'
  },
  {
    title: 'Scraper Tab 🔍',
    description: 'Start here! Log in with your ISMIS credentials to automatically fetch course data. You can scrape specific courses or all available courses for the semester.',
    targetId: 'sidebar-scraper',
    position: 'right'
  },
  {
    title: 'Saved Files 📁',
    description: 'All your scraped data is saved here. Load different datasets to switch between semesters or course selections. The most recent file is loaded automatically.',
    targetId: 'sidebar-files',
    position: 'right'
  },
  {
    title: 'Schedule Builder 📅',
    description: 'The main feature! Select courses and generate all possible schedule combinations. Navigate between combinations to find the perfect fit. Green schedules have no conflicts!',
    targetId: 'sidebar-schedule',
    position: 'right'
  },
  {
    title: 'Available Rooms 🚪',
    description: 'Find vacant rooms for study or rest! Select a day and time to see which rooms are free. Perfect for finding quiet spaces between classes.',
    targetId: 'sidebar-rooms',
    position: 'right'
  },
  {
    title: 'Settings ⚙️',
    description: 'Customize your experience! Change theme (dark/light), scraper settings, and display preferences. All settings are saved automatically.',
    targetId: 'sidebar-settings',
    position: 'right'
  },
  {
    title: "You're All Set! 🎉",
    description: "That's the quick tour! Remember: Scraper → Saved Files → Schedule Builder is your typical workflow. Start by scraping some courses and build your perfect schedule!",
    targetId: 'app-root',
    position: 'bottom'
  }
];

interface TutorialOverlayProps {
  onClose: () => void;
}

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      updateSpotlight();
    }, 100);
    
    // Add resize listener
    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const updateSpotlight = () => {
    const element = document.getElementById(step.targetId);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightRect(rect);
      
      // For app-root (welcome/finish screens), center the tooltip
      if (step.targetId === 'app-root') {
        setTooltipPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2
        });
        return;
      }
      
      // Calculate tooltip position with viewport bounds checking
      const padding = 20;
      const tooltipWidth = 400;
      const tooltipHeight = 300; // Approximate height
      let top = 0;
      let left = 0;
      
      switch (step.position) {
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + padding;
          // Check if tooltip would go off right edge
          if (left + tooltipWidth > window.innerWidth) {
            left = rect.left - tooltipWidth - padding;
          }
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - padding;
          break;
        case 'top':
          top = rect.top - padding;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2;
          break;
      }
      
      // Ensure tooltip stays within viewport bounds
      const minLeft = padding;
      const maxLeft = window.innerWidth - tooltipWidth - padding;
      const minTop = padding;
      const maxTop = window.innerHeight - tooltipHeight - padding;
      
      left = Math.max(minLeft, Math.min(left, maxLeft));
      top = Math.max(minTop, Math.min(top, maxTop));
      
      setTooltipPosition({ top, left });
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with spotlight cutout */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && step.targetId !== 'app-root' && (
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Spotlight border effect */}
      {spotlightRect && step.targetId !== 'app-root' && (
        <div
          className="absolute border-4 border-[var(--usc-green)] rounded-xl pointer-events-none shadow-[0_0_30px_rgba(0,168,89,0.5)] animate-pulse"
          style={{
            top: spotlightRect.top - 8,
            left: spotlightRect.left - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className={`absolute transition-all duration-300 ${
          step.targetId === 'app-root' ? 'transform -translate-x-1/2 -translate-y-1/2' :
          step.position === 'right' ? 'transform -translate-y-1/2' :
          step.position === 'left' ? 'transform -translate-x-full -translate-y-1/2' :
          step.position === 'top' ? 'transform -translate-x-1/2 -translate-y-full' :
          'transform -translate-x-1/2'
        }`}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          maxWidth: '400px',
          zIndex: 10000,
        }}
      >
        <Card className="p-6 shadow-2xl border-2 border-[var(--usc-green)] bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--usc-green)]" />
              <h3 className="font-semibold text-lg">{step.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6">
            {step.description}
          </p>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-[var(--usc-green)]'
                    : index < currentStep
                    ? 'w-2 bg-[var(--usc-green)]/50'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {tutorialSteps.length}
            </span>
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="gap-1"
                style={{ backgroundColor: 'var(--usc-green)', color: 'white' }}
              >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

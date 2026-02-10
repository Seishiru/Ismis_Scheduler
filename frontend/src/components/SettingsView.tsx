import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function SettingsView() {
  // Scraper Settings - Load from localStorage
  const [headlessMode, setHeadlessMode] = useState(() => {
    const saved = localStorage.getItem('scraper_headless');
    return saved !== null ? saved === 'true' : true;
  });
  const [politeDelay, setPoliteDelay] = useState(() => localStorage.getItem('scraper_polite_delay') || '0.6');

  // Display Settings - Load from localStorage
  const [showConflicts, setShowConflicts] = useState(() => {
    const saved = localStorage.getItem('display_show_conflicts');
    return saved !== null ? saved === 'true' : true;
  });
  const [use24Hour, setUse24Hour] = useState(() => {
    const saved = localStorage.getItem('display_24hour');
    return saved !== null ? saved === 'true' : false;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('display_theme') || 'light');

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const handleUpdateScraperSettings = () => {
    // Save scraper settings to localStorage
    localStorage.setItem('scraper_headless', String(headlessMode));
    localStorage.setItem('scraper_polite_delay', politeDelay);
    toast.success('Scraper settings updated successfully');
  };

  const handleUpdateDisplaySettings = () => {
    // Save display settings to localStorage
    localStorage.setItem('display_show_conflicts', String(showConflicts));
    localStorage.setItem('display_24hour', String(use24Hour));
    localStorage.setItem('display_theme', theme);
    
    toast.success('Display settings updated successfully');
    
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'auto') {
      // Auto mode: check system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    // Dispatch event for App.tsx to listen
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear all localStorage data
      localStorage.clear();
      
      // Clear all sessionStorage data
      sessionStorage.clear();
      
      toast.success('All data cleared successfully');
      
      // Reload the page to reset the application state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your course schedule optimizer preferences</p>
      </div>

      {/* Scraper Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Scraper Settings</h3>
        <div className="space-y-4 max-w-md">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Headless Mode</Label>
              <p className="text-sm text-muted-foreground">Run browser in background (faster)</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground min-w-[40px]">
                {headlessMode ? 'true' : 'false'}
              </span>
              <Switch 
                checked={headlessMode}
                onCheckedChange={(checked) => setHeadlessMode(checked)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay">Polite Delay (seconds)</Label>
            <Input 
              id="delay" 
              type="number" 
              step="0.1"
              min="0.1"
              max="5"
              value={politeDelay}
              onChange={(e) => setPoliteDelay(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Time to wait between requests (0.4 - 0.9 recommended)
            </p>
          </div>
          <Button 
            className="w-full"
            style={{ backgroundColor: 'var(--usc-green)', color: 'white' }}
            onClick={handleUpdateScraperSettings}
          >
            Update Scraper Settings
          </Button>
        </div>
      </Card>

      {/* Display Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
        <div className="space-y-4 max-w-md">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Conflict Alerts</Label>
              <p className="text-sm text-muted-foreground">Highlight overlapping courses</p>
            </div>
            <Switch 
              checked={showConflicts}
              onCheckedChange={(checked) => setShowConflicts(checked)}
            />
          </div>
          <Button 
            className="w-full"
            style={{ backgroundColor: 'var(--usc-green)', color: 'white' }}
            onClick={handleUpdateDisplaySettings}
          >
            Update Display Settings
          </Button>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>
        <div className="space-y-3 max-w-md">
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={handleClearAllData}
          >
            Clear All Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
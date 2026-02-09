import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { useState } from 'react';
import { toast } from 'sonner';

export function SettingsView() {
  // ISMIS Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Academic Period
  const [period, setPeriod] = useState('second');
  const [year, setYear] = useState('2025');

  // Scraper Settings
  const [headlessMode, setHeadlessMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [politeDelay, setPoliteDelay] = useState('0.6');

  // Display Settings
  const [showConflicts, setShowConflicts] = useState(true);
  const [use24Hour, setUse24Hour] = useState(false);
  const [theme, setTheme] = useState('light');

  const handleSaveCredentials = () => {
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    // In a real app, this would securely save credentials
    toast.success('ISMIS credentials saved successfully');
  };

  const handleUpdateAcademicPeriod = () => {
    toast.success('Academic period updated successfully');
  };

  const handleUpdateScraperSettings = () => {
    toast.success('Scraper settings updated successfully');
  };

  const handleUpdateDisplaySettings = () => {
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

  const handleExportSchedule = () => {
    toast.success('Schedule exported as JSON');
    // In a real app, this would trigger a download
  };

  const handleImportCourseData = () => {
    toast.info('File picker would open here');
    // In a real app, this would open a file picker
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      toast.success('All data cleared successfully');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your course schedule optimizer preferences</p>
      </div>

      {/* ISMIS Credentials */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">USC ISMIS Credentials</h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              placeholder="Enter your ISMIS username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Enter your ISMIS password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button 
            className="w-full"
            style={{ backgroundColor: 'var(--usc-green)', color: 'white' }}
            onClick={handleSaveCredentials}
          >
            Save Credentials
          </Button>
        </div>
      </Card>

      {/* Academic Period */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Academic Period</h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="period">Academic Period</Label>
            <Select 
              defaultValue="second"
              value={period}
              onValueChange={(value) => setPeriod(value)}
            >
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">1st Semester</SelectItem>
                <SelectItem value="second">2nd Semester</SelectItem>
                <SelectItem value="summer">Summer</SelectItem>
                <SelectItem value="first-tri">1st Trimester</SelectItem>
                <SelectItem value="second-tri">2nd Trimester</SelectItem>
                <SelectItem value="third-tri">3rd Trimester</SelectItem>
                <SelectItem value="transition">Transition Term</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Academic Year</Label>
            <Input 
              id="year" 
              type="number" 
              defaultValue="2025" 
              placeholder="2025" 
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <Button 
            className="w-full"
            style={{ backgroundColor: 'var(--usc-green)', color: 'white' }}
            onClick={handleUpdateAcademicPeriod}
          >
            Update Academic Period
          </Button>
        </div>
      </Card>

      {/* Scraper Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Scraper Settings</h3>
        <div className="space-y-4 max-w-md">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Headless Mode</Label>
              <p className="text-sm text-muted-foreground">Run browser in background (faster)</p>
            </div>
            <Switch 
              defaultChecked={headlessMode}
              onCheckedChange={(checked) => setHeadlessMode(checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-refresh Data</Label>
              <p className="text-sm text-muted-foreground">Automatically update course data</p>
            </div>
            <Switch 
              defaultChecked={autoRefresh}
              onCheckedChange={(checked) => setAutoRefresh(checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay">Polite Delay (seconds)</Label>
            <Input 
              id="delay" 
              type="number" 
              defaultValue="0.6" 
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
              defaultChecked={showConflicts}
              onCheckedChange={(checked) => setShowConflicts(checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>24-Hour Time Format</Label>
              <p className="text-sm text-muted-foreground">Use 24-hour clock in schedule</p>
            </div>
            <Switch 
              defaultChecked={use24Hour}
              onCheckedChange={(checked) => setUse24Hour(checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select 
              defaultValue="light"
              value={theme}
              onValueChange={(value) => setTheme(value)}
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
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
            className="w-full justify-start"
            onClick={handleExportSchedule}
          >
            Export Schedule as JSON
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleImportCourseData}
          >
            Import Course Data
          </Button>
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
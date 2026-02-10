import { Card } from './ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface DataStatusHeaderProps {
  lastUpdated: string | null;
}

export function DataStatusHeader({ lastUpdated }: DataStatusHeaderProps) {
  if (!lastUpdated) {
    return (
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No course data loaded yet. Use the Scraper tab to create data or the Saved Files tab to load existing data.
          </p>
        </div>
      </Card>
    );
  }

  const lastUpdatedDate = new Date(lastUpdated);
  const now = new Date();
  const hoursAgo = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);

  const isRecent = hoursAgo < 24;
  const timeString = lastUpdatedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <Card className={`p-4 mb-4 ${
      isRecent 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    }`}>
      <div className="flex items-center gap-2">
        <CheckCircle className={`w-5 h-5 ${isRecent ? 'text-green-600 dark:text-green-500' : 'text-orange-600 dark:text-orange-500'}`} />
        <p className={`text-sm ${isRecent ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
          Course data loaded: <span className="font-semibold">{timeString}</span>
          {!isRecent && ` (${Math.floor(hoursAgo)} hours ago - consider re-scraping for latest updates)`}
        </p>
      </div>
    </Card>
  );
}

import { Database, Calendar, Settings, Info, DoorOpen, FileJson, BookOpen } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'scraper', label: 'Scraper', icon: Database },
    { id: 'files', label: 'Saved Files', icon: FileJson },
    { id: 'schedule', label: 'Schedule Builder', icon: Calendar },
    { id: 'rooms', label: 'Available Rooms', icon: DoorOpen },
    { id: 'guide', label: 'Guide', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="w-64 h-screen border-r border-gray-200 dark:border-gray-700 flex flex-col" style={{ backgroundColor: 'var(--usc-green)' }}>
      {/* Logo and Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">USC Course</h2>
            <p className="text-white/80 text-sm">Schedule Optimizer</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  id={`sidebar-${item.id}`}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-[var(--usc-green)] shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/20">
        <p className="text-white/60 text-xs text-center">
          © 2025 USC San Carlos
        </p>
      </div>
    </div>
  );
}
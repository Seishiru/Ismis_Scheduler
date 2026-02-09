import { Card } from './ui/card';
import { Github, Mail, Heart, Code } from 'lucide-react';
// TODO: Add GCash QR code image to public folder
// import gcashQR from '/path/to/gcash-qr.png';

export function AboutView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">About</h1>
        <p className="text-muted-foreground mt-1">Meet the creator and support the project</p>
      </div>

      {/* Creator Info */}
      <Card className="p-8">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--usc-green)] to-[var(--usc-green-light)] flex items-center justify-center mb-6">
            <Code className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-2">USC Course Schedule Optimizer</h2>
          <p className="text-muted-foreground mb-6">
            A powerful web application designed to help USC students efficiently scrape course data 
            and build their ideal class schedules with automatic conflict detection.
          </p>

          <div className="w-full border-t border-border pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Created by</h3>
            <p className="mb-2">Cecil Quibranza</p>
            <p className="text-sm text-muted-foreground mb-4">Computer Science Student, USC San Carlos</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-1">Python Backend</p>
              <p className="text-sm text-muted-foreground">Playwright web scraping</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-1">React Frontend</p>
              <p className="text-sm text-muted-foreground">Modern UI with Tailwind</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-1">Drag & Drop</p>
              <p className="text-sm text-muted-foreground">Intuitive schedule builder</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-1">Smart Detection</p>
              <p className="text-sm text-muted-foreground">Automatic conflict alerts</p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex gap-4">
            <a 
              href="mailto:rapharaphaerl54@gmail.com" 
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </a>
            <a 
              href="https://github.com/Seishiru" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="text-sm">GitHub</span>
            </a>
          </div>
        </div>
      </Card>

      {/* Donation Section */}
      <Card className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Support the Project</h3>
            <p className="text-muted-foreground">
              If you find this tool helpful, consider supporting the development with a donation.
              Your support helps maintain and improve this project!
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            {/* QR Code */}
            <div className="w-64 h-64 border-2 border-border rounded-lg flex flex-col items-center justify-center bg-muted">
              {/* TODO: Add your GCash QR code image */}
              <div className="flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                <p>Add your GCash QR code image here</p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Scan to Donate via InstaPay</p>
              <p className="text-xs text-muted-foreground">
                GCash supported
              </p>
            </div>

            {/* Alternative Payment Options */}
            <div className="w-full max-w-md space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium">GCash</span>
                <span className="text-sm text-muted-foreground">0968-702-7777</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tech Stack */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-center">Built With</h3>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">Python</span>
          <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 rounded-full text-sm font-medium">React</span>
          <span className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 rounded-full text-sm font-medium">TypeScript</span>
          <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded-full text-sm font-medium">Tailwind CSS</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium">Playwright</span>
          <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 rounded-full text-sm font-medium">Lucide Icons</span>
        </div>
      </Card>

      {/* License */}
      <Card className="p-6">
        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-2">© 2025 USC Course Schedule Optimizer</p>
          <p>
            This project is for educational purposes only. 
            Please use responsibly and in accordance with USC policies.
          </p>
        </div>
      </Card>
    </div>
  );
}
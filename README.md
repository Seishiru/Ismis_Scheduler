# ISMIS Scheduler

A full-stack application for scraping and visualizing USC (University of San Carlos) ISMIS course schedules with an interactive web-based calendar interface.

## Overview

This project automates the collection of course schedule data from the USC ISMIS (Information System for Management of Instructional Services) system and provides a user-friendly web interface to view, analyze, and manage course schedules.

## Features

- **Web Scraping**: Automated Playwright-based scraper that extracts course data from ISMIS
- **Schedule Parsing**: Intelligent parsing of complex schedule formats (e.g., "TTh 09:00 AM - 10:30 AM")
- **Interactive Calendar**: React-based frontend for viewing schedules in a calendar format
- **JSON Export**: Export schedule data to JSON for further processing
- **Performance Optimized**: Resource blocking and smart caching to minimize server load
- **Error Handling**: Robust error handling with detailed logging and recovery mechanisms

## Project Structure

```
ISMIS_Scheduler/
├── ismis_scheduler.py          # Main scraper script
├── calendar_test.py            # Calendar visualization test utilities
├── test_real_data.py           # Real data testing utilities
├── main.tsx                    # React application entry point
├── index.html                  # HTML template
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Node.js dependencies
├── courses.json                # Sample course data
├── 2nd-Semester_2025.json      # Semester schedule data
└── schedule_view_*.html        # Generated schedule visualizations
```

## Technologies Used

### Backend
- **Python 3.x**
- **Playwright**: Headless browser automation for web scraping
- **JSON**: Data storage and exchange format

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Modern build tool and dev server
- **Sonner**: Toast notification library
- **CSS**: Custom styling

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ISMIS_Scheduler
   ```

2. **Install Python dependencies**
   ```bash
   pip install playwright
   playwright install
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

## Usage

### Running the Scraper

```bash
python ismis_scheduler.py
```

The scraper will:
1. Connect to the ISMIS system
2. Extract course information
3. Parse schedule data
4. Export to JSON format

### Running the Web Interface

**Development mode:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
npm run preview
```

### Running Tests

```bash
python calendar_test.py
python test_real_data.py
```

## Data Format

### Course Data Structure

```json
{
  "code": "GE-STS - Group 1",
  "description": "SCIENCE, TECHNOLOGY AND SOCIETY",
  "status": "BLOCKSECTION",
  "teacher": "LIWAG, JOHN WARUEL F.",
  "schedule": "TTh 09:00 AM - 10:30 AM",
  "room": "LB264TC",
  "department": "DEPARTMENT OF COMPUTER ENGINEERING",
  "enrolled": "41/41"
}
```

## Configuration

### Scraper Settings
- `POLITE_MIN_DELAY`: Minimum delay between requests (default: 0.4s)
- `POLITE_MAX_DELAY`: Maximum delay between requests (default: 0.9s)
- Adjustable timeouts for page navigation and element selection

## Development Notes

- The scraper includes rate limiting to be respectful to the ISMIS server
- Resources like images and fonts are blocked to improve scraping speed
- Schedule parsing handles various time formats (12-hour with AM/PM)
- The calendar visualization supports dynamic schedule updates

## Known Limitations

- Requires active ISMIS access credentials
- Schedule parsing may vary based on ISMIS UI updates
- Test files contain hardcoded sample data for development

## Future Enhancements

- User authentication system
- Schedule comparison and conflict detection
- Export to .ics format for calendar applications
- Mobile-responsive design improvements
- Database integration for historical data tracking

## Contributing

This is a personal project. Feel free to fork and modify as needed.

## License

MIT License - See LICENSE file for details

## Contact

For issues or questions about this project, please refer to the project repository.

---

**Last Updated**: February 2026

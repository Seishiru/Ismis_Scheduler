# ISMIS Course Scheduler API Setup

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

```bash
playwright install chromium
```

### 3. Start the API Server

```bash
python api.py
```

The API will be available at:
- Server: `http://localhost:5000`
- API Docs: `http://localhost:5000/docs`
- Health Check: `http://localhost:5000/health`

## Frontend Setup

### 1. Install Dependencies (if not already done)

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Scraping
- `POST /api/scrape/specific` - Scrape specific courses
- `POST /api/scrape/all` - Scrape all courses
- `GET /api/scrape/status/{task_id}` - Get scraping status

### Courses
- `GET /api/courses` - Get scraped courses
- `GET /api/schedules/available` - List available JSON files

### Schedule Generation
- `POST /api/schedules/generate` - Generate schedule combinations

## Usage Flow

1. **Start Backend API** - Run `python api.py` in backend folder
2. **Start Frontend** - Run `npm run dev` in frontend folder
3. **Open Browser** - Navigate to `http://localhost:5173`
4. **Scrape Courses** - Use the Scraper view to fetch course data from ISMIS
5. **Build Schedule** - Select courses and generate optimal schedules
6. **View Results** - See calendar view with conflict detection

## Environment Variables

Create `.env` in the frontend folder:

```env
VITE_API_URL=http://localhost:5000
```

## Testing the API

You can test the API using the interactive documentation at `http://localhost:5000/docs` or use curl:

```bash
# Health check
curl http://localhost:5000/health

# Get courses
curl http://localhost:5000/api/courses
```

## Troubleshooting

### Backend Issues
- **Port 5000 in use**: Change port in `api.py` (search for `uvicorn.run`)
- **Module not found**: Run `pip install -r requirements.txt`
- **Playwright error**: Run `playwright install chromium`

### Frontend Issues
- **API connection failed**: Ensure backend is running on port 5000
- **CORS error**: Check that CORS middleware in `api.py` includes your frontend URL

### Connection Issues
- **Can't reach API**: Check firewall settings
- **Different ports**: Update `VITE_API_URL` in `.env`

# ISMIS Course Scheduler API Setup

## GitHub Actions CI/CD

This project has automated testing configured with GitHub Actions. Every push and pull request triggers the **Playwright Tests** workflow to validate dependencies and run tests.

**View workflow status**: https://github.com/Seishiru/Ismis_Scheduler/actions

The workflow automatically:
- Checks out your code
- Sets up Python 3.13
- Installs dependencies from `backend/requirements.txt`
- Installs Playwright browsers
- Runs pytest with trace capture on failures
- Uploads test artifacts for debugging

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Note**: The `requirements.txt` includes:
- `playwright` - For web scraping and browser automation
- `fastapi` - For API server
- `pytest` - For automated testing
- `pytest-playwright` - For Playwright test integration
- Other dependencies listed in the file

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

## Automated Testing

### Running Tests Locally

```bash
# Run all tests (with Playwright integration)
cd backend
pytest --tracing=retain-on-failure

# Run specific test file
pytest test_real_data.py

# Run with verbose output
pytest -v
```

### GitHub Actions Testing

Tests automatically run on every push via GitHub Actions:

1. **Push your code** to `main` or `master` branch
2. **Check Actions tab** on GitHub for workflow status
3. **View test logs** by clicking the workflow run
4. **Download traces** from artifacts for debugging failed tests

### Test Coverage

Current tests include:
- `test_real_data.py` - Tests with real course data
- Additional unit tests as needed

**Note**: Some tests (`test_friday.py`, `test_real_data.py`) are excluded from CI/CD as they require sample data files that aren't in the repository. You can run them locally if needed.

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

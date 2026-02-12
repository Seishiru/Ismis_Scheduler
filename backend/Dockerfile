# Use official Playwright image with Python
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (already in the base image, but ensure chromium is available)
RUN playwright install chromium

# Copy application code
COPY . .

# Expose port (Render will set PORT env variable)
EXPOSE 10000

# Run the application
CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-10000}

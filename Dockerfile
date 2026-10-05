# Multi-stage Dockerfile for CardioWatch Clinical Surveillance Engine
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.9-slim AS runtime
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code, data, models, and tests
COPY backend/ ./backend/
COPY data/ ./data/
COPY tests/ ./tests/
COPY run_app.py .

# Copy pre-built frontend distribution from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose service port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start production server (supports Render/Railway dynamic PORT)
CMD ["sh", "-c", "python3 -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

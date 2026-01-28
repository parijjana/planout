# Base image with Python
FROM python:3.11-slim

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# --- Frontend Build ---
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
# Use npm install which is more robust if lockfile is missing/out of sync
RUN npm install

COPY frontend/ ./
# Output: /app/frontend/out
RUN npm run build

# --- Backend Setup ---
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Ensure we are in the backend dir to run uvicorn easily, 
# or adjust python path. 
# We need to go up one level if we want to reference app.main correctly relative to backend root?
# No, uvicorn app.main:app works if we are in /app/backend.

ENV PORT=8000
EXPOSE $PORT

# Start command
# We use shell form to expand $PORT
CMD sh -c "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"

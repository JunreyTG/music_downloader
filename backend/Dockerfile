FROM python:3.12-slim

# Install system dependencies (ffmpeg is essential for audio transcoding in yt-dlp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Ensure storage directories exist
RUN mkdir -p /app/app/storage/downloads

# Default environment configuration
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start server
CMD ["python", "run_server.py"]

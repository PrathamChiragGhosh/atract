# Multi-stage Dockerfile for Node.js + Python Application

# Stage 1: Python Environment
FROM python:3.11-slim as python-base

WORKDIR /app/python

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY python/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -m nltk.downloader stopwords punkt -d /usr/local/nltk_data

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Stage 2: Node.js Environment
FROM node:18-slim as node-base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Stage 3: Final Image
FROM node:18-slim

WORKDIR /app

# Install Python 3 and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy Python environment from python-base
COPY --from=python-base /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=python-base /usr/local/bin /usr/local/bin
COPY --from=python-base /usr/local/nltk_data /usr/local/nltk_data

# Copy Node.js environment from node-base
COPY --from=node-base /app/node_modules ./node_modules
COPY --from=node-base /app/package*.json ./

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/candidate-files \
    uploads/filtered-resumes \
    uploads/pdf \
    compressed/pdf \
    temp/pdf

# Set Python path
ENV PYTHONPATH=/app/python
ENV PYTHON_COMMAND=python3
ENV NLTK_DATA=/usr/local/nltk_data

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/api/candidates/filter/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]


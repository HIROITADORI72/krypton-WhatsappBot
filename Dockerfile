# Use Node.js 20 LTS with Debian Bookworm (current stable)
FROM node:20-bookworm

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    webp \
    ca-certificates && \
    apt-get upgrade -y && \
    npm install -g pm2 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with legacy peer deps flag to handle ESLint peer dependency conflicts
RUN npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Expose port (if needed for web API)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]

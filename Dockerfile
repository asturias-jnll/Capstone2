# Production Dockerfile for Render deployment (Repository Root)
FROM node:18-alpine

# Install Chromium and dependencies for Puppeteer, plus runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY imvcmpc/auth/package*.json ./

# Install dependencies (bcryptjs is pure JS, no native compilation needed)
RUN npm ci --only=production && npm cache clean --force

# Copy all application files from auth directory
COPY imvcmpc/auth/ ./

# Copy static files
COPY imvcmpc/shared/ ./static/shared/
COPY imvcmpc/financeofficer/ ./static/financeofficer/
COPY imvcmpc/marketingclerk/ ./static/marketingclerk/
COPY imvcmpc/ithead/ ./static/ithead/
COPY imvcmpc/logpage/ ./static/logpage/
COPY imvcmpc/assets/ ./static/assets/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Set ownership
RUN chown -R appuser:nodejs /app
USER appuser

# Expose port (Render will set PORT environment variable)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "server.js"]

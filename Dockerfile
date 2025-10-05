# Production Dockerfile for Render deployment (Repository Root)
FROM node:18-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY imvcmpc/auth/package*.json ./

# Install dependencies and rebuild native modules for target architecture
RUN npm ci --only=production && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/node_modules ./node_modules

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

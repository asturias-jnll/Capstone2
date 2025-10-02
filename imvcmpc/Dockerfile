# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package files for backend
COPY auth/package*.json ./auth/

# Install backend dependencies
RUN cd auth && npm ci --only=production

# Copy backend source code
COPY auth/ ./auth/

# Copy static frontend files
COPY shared/ ./static/shared/
COPY financeofficer/ ./static/financeofficer/
COPY marketingclerk/ ./static/marketingclerk/
COPY ithead/ ./static/ithead/
COPY logpage/ ./static/logpage/
COPY assets/ ./static/assets/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "auth/server.js"]

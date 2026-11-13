# ==========================================
# Production Dockerfile for Express Backend
# ==========================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Copy package dependency manifests
COPY package.json package-lock.json ./

# Install only production dependencies (skips devDependencies like nodemon)
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure data directory exists with write permissions for SQLite fallback if needed
RUN mkdir -p data && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose backend port
EXPOSE 5000

# Health check to ensure Express API is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the Node.js production server
CMD ["node", "server.js"]

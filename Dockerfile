# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Set production environment
ENV NODE_ENV=production

# Expose port (Railway assigns PORT dynamically)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
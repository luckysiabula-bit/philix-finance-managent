# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy everything first
COPY . .

# Change to backend directory and install dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Set production environment
ENV NODE_ENV=production

# Expose port (Railway assigns PORT dynamically)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
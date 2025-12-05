# Frontend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Install serve to serve the built app
RUN npm install -g serve

# Expose port
EXPOSE $PORT

# Serve the built app
CMD serve -s dist -l $PORT
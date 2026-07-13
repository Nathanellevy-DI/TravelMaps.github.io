FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3001

# Create a directory for persistent data (mounted via volume in fly.toml)
RUN mkdir -p /data/uploads

# Expose the API port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]

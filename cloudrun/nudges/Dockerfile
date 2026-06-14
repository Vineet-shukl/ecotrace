FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Cloud Run expects $PORT to be honoured
ENV PORT=8080
EXPOSE 8080

# Use non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

CMD ["node", "index.js"]

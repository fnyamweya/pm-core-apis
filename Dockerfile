# syntax=docker/dockerfile:1.7

########################
# Base image
########################
FROM node:20-alpine AS base
WORKDIR /app

# Set the port environment variable. The app will pick this up via process.env.PORT.
ENV PORT=3000

########################
# Development stage
########################
FROM base AS dev

# Copy only package manifests first for better caching
COPY package*.json ./

# Install all dependencies including devDependencies
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source
COPY . .

# Expose the default port. This is used for local development only.
EXPOSE 8080

# Command to run the dev server. Uses ts-node for live compilation.
CMD ["npm", "run", "dev"]

########################
# Build stage
########################
FROM base AS build

# Copy manifests and install dependencies
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source
COPY . .

# Build TypeScript sources into dist
RUN npm run build

# Remove dev dependencies to optimise layer size (optional but recommended)
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev

########################
# Production runtime
########################
FROM node:20-alpine AS production
WORKDIR /app

# Set production environment variable and port
ENV NODE_ENV=production \
    PORT=3000

# Copy package manifests
COPY package*.json ./

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy the compiled application from the build stage
COPY --from=build /app/dist ./dist

# Drop privileges to a non-root user provided by the base node image
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Run the compiled application. Use node directly for fast startup
CMD ["node", "dist/server.js"]

# Healthcheck to verify container is serving requests. The CDK stack uses
# /api/v1/health by default.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null || exit 1
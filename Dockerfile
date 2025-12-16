# ==============================================================================
# Stage 1: Dependencies
# ==============================================================================
FROM node:20-slim AS deps

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy prisma schema first (needed for postinstall script)
COPY prisma ./prisma

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --ignore-scripts && \
    npx prisma generate

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:20-slim AS builder

# Build arguments for versioning
ARG BUILDTIME
ARG VERSION
ARG REVISION

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables (will be overridden at runtime)
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/placeholder?schema=public"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="build-time-secret-placeholder-32chars"

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:production

# ==============================================================================
# Stage 3: Production Runner
# ==============================================================================
FROM node:20-slim AS runner

# Labels for image metadata
LABEL org.opencontainers.image.title="WorkB CMS"
LABEL org.opencontainers.image.description="WorkB CMS Application"
LABEL org.opencontainers.image.vendor="CodeB"
LABEL org.opencontainers.image.source="https://github.com/codeb-dev/workb-cms"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="${REVISION}"
LABEL org.opencontainers.image.created="${BUILDTIME}"

WORKDIR /app

# Environment configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Set permissions
RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Runtime configuration
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:3000/api/health || exit 1

# Entrypoint and command
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
